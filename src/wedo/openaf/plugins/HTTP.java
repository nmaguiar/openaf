package wedo.openaf.plugins;

/**
 * Core HTTP plugin
 * @author Nuno Aguiar <nuno.aguiar@wedotechnologies.com>
 *
 */
import java.io.IOException;
import java.net.Authenticator;
import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpURLConnection;
import java.net.PasswordAuthentication;
import java.net.URI;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.Future;

import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.WebSocketAdapter;
import org.eclipse.jetty.websocket.client.WebSocketClient;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.NativeFunction;
import org.mozilla.javascript.NativeObject;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.annotations.JSConstructor;
import org.mozilla.javascript.annotations.JSFunction;

import wedo.openaf.AFBase;
import wedo.openaf.AFCmdBase;
import wedo.openaf.SimpleLog;

public class HTTP extends ScriptableObject {
	protected static CookieManager ckman = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
	protected HTTPResponse output = new HTTPResponse("", -1, null, "");
	protected Object outputObj = new Object();
	protected Object errorObj = new Object();
	
	/**
	 * 
	 */
	private static final long serialVersionUID = -2025553185688930581L;

	public static class HTTPResponse {
		/**
		 * 
		 */
		public String response;
		public byte[] responseBytes;
		public int responseCode;
		public String contentType;
		public Map<String, List<String>> responseHeaders;
		
		public HTTPResponse(String response, int responseCode, Map<String, List<String>> map, String contentType) {
			this.response = response;
			this.responseCode = responseCode;
			this.responseHeaders = map;
			this.contentType = contentType;
		}
		
		public HTTPResponse(byte[] response, int responseCode, Map<String, List<String>> map, String contentType) {
			this.responseBytes = response;
			this.responseCode = responseCode;
			this.responseHeaders = map;
			this.contentType = contentType;
		}

	}

	public class EventSocket extends WebSocketAdapter {
		NativeFunction onConnect, onMsg, onError, onClose;
		
		public EventSocket(NativeFunction onConnect, NativeFunction onMsg, NativeFunction onError,
				NativeFunction onClose) {
			this.onConnect = onConnect;
			this.onMsg = onMsg;
			this.onError = onError;
			this.onClose = onClose;
		}

		@Override
		public void onWebSocketConnect(Session sess) {
			super.onWebSocketConnect(sess);
			try {
				Context cx = (Context) AFCmdBase.jse.enterContext();
				this.onConnect.call(cx, (Scriptable) AFCmdBase.jse.getGlobalscope(), cx.newObject((Scriptable) AFCmdBase.jse.getGlobalscope()), new Object[] {sess});
			} catch (Exception e) {
				throw e;
			} finally {
				AFCmdBase.jse.exitContext();
			}
		}
		
		@Override
		public void onWebSocketText(String payload) {
			super.onWebSocketText(payload);
			try {
				Context cx = (Context) AFCmdBase.jse.enterContext();
				this.onMsg.call(cx, (Scriptable) AFCmdBase.jse.getGlobalscope(), cx.newObject((Scriptable) AFCmdBase.jse.getGlobalscope()), new Object[] {"text", payload});
			} catch (Exception e) {
				throw e;
			} finally {
				AFCmdBase.jse.exitContext();
			}
		}
		
		@Override
		public void onWebSocketBinary(byte[] payload, int offset, int len) {
			super.onWebSocketBinary(payload, offset, len);
			try {
				Context cx = (Context) AFCmdBase.jse.enterContext();
				this.onMsg.call(cx, (Scriptable) AFCmdBase.jse.getGlobalscope(), cx.newObject((Scriptable) AFCmdBase.jse.getGlobalscope()), new Object[] {"bytes", payload, offset, len});
			} catch (Exception e) {
				throw e;
			} finally {
				AFCmdBase.jse.exitContext();
			}			
		}
		
		@Override
		public void onWebSocketClose(int statusCode, String reason) {
			super.onWebSocketClose(statusCode, reason);
			try {
				Context cx = (Context) AFCmdBase.jse.enterContext();
				this.onClose.call(cx, (Scriptable) AFCmdBase.jse.getGlobalscope(), cx.newObject((Scriptable) AFCmdBase.jse.getGlobalscope()), new Object[] {statusCode, reason});
			} catch (Exception e) {
				throw e;
			} finally {
				AFCmdBase.jse.exitContext();
			}
		}
		
		@Override
		public void onWebSocketError(Throwable cause) {
			super.onWebSocketError(cause);
			try {
				Context cx = (Context) AFCmdBase.jse.enterContext();
				this.onError.call(cx, (Scriptable) AFCmdBase.jse.getGlobalscope(), cx.newObject((Scriptable) AFCmdBase.jse.getGlobalscope()), new Object[] {cause});
			} catch (Exception e) {
				throw e;
			} finally {
				AFCmdBase.jse.exitContext();
			}
		}
	}
	
	/**
	 * 
	 */
	@Override
	public String getClassName() {
		return "HTTP";
	}

	/**
	 * <odoc>
	 * <key>HTTP.http(aURL, aRequestType, aIn, aRequestMap, isBytes, aTimeout)</key>
	 * Builds a HTTP request for the aURL provided with aRequestType (e.g. "GET" or "POST") sending
	 * aIn body request (or "") and optionally sending aRequestMap headers and optionally specifying 
	 * if the response isBytes and providing an optional custom HTTP aTimeout.  
	 * If needed use java.lang.System.setProperty("sun.net.http.allowRestrictedHeaders", "true") to 
	 * allow you to use restricted request headers.
	 * </odoc>
	 */
	@JSConstructor
	public void newHTTP(String url, String requestType, Object in, NativeObject request, boolean bytes, int timeout) throws IOException {
		exec(url, requestType, in, request, bytes, timeout);
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.login(aUser, aPassword)</key>
	 * Tries to build a simple password authentication with the provided aUser and aPassword (encripted or not)
	 * </odoc>
	 */
	@JSFunction
	public void login(final String user, final String pass) {
		Authenticator authenticator = new Authenticator() {
			public PasswordAuthentication getPasswordAuthentication() {
				return new PasswordAuthentication (user, (AFCmdBase.afc.dIP(pass)).toCharArray());
			}
		};
		Authenticator.setDefault(authenticator);
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.exec(aUrl, aRequestType, aIn, aRequestMap, isBytes, aTimeout)</key>
	 * Builds a HTTP request for the aURL provided with aRequestType (e.g. "GET" or "POST") sending
	 * aIn body request (or "") and optionally sending aRequestMap headers and optionally specifying 
	 * if the response isBytes and providing an optional custom HTTP aTimeout. 
	 * </odoc>
	 */
	@JSFunction
	public Object exec(String url, String requestType, Object in, NativeObject request, boolean bytes, int timeout) throws IOException {
		Properties requestProps = new Properties();
		
		if (requestType.equals("undefined") || requestType == null) {
			requestType = "GET";
		}
		if (url.equals("undefined") || url == null) {
			return new HTTPResponse("No URL", -1, null, "");
		}
		if (in.equals("undefined") || in == null) {
			in = "";
		}
		
		if (request != null) {
			for(Object o : request.keySet()) {
				requestProps.put(o, request.get(o));
			}
		}
		
		output = request(url, requestType, in, requestProps, bytes, timeout);
		Context cx = (Context) AFCmdBase.jse.enterContext();
		Scriptable no = cx.newObject((Scriptable) AFCmdBase.jse.getGlobalscope());
		AFCmdBase.jse.exitContext();

		if (bytes) {
			no.put("responseBytes", no, output.responseBytes);
		} else {
			no.put("response", no, output.response);	
		}
		no.put("responseCode", no, output.responseCode);
		no.put("contentType", no, output.contentType);
		outputObj = no;
	
		return outputObj;
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.get(aUrl, aIn, aRequestMap, isBytes, aTimeout)</key>
	 * Builds a HTTP request for the aURL with a GET sending
	 * aIn body request (or "") and optionally sending aRequestMap headers and optionally specifying 
	 * if the response isBytes and providing an optional custom HTTP aTimeout. 
	 * </odoc>
	 */
	@JSFunction
	public Object get(String url, Object in, NativeObject request, boolean bytes, int timeout) throws IOException {
		return exec(url, "GET", in, request, bytes, timeout);
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.get(aUrl, aIn, aRequestMap, isBytes, aTimeout)</key>
	 * Builds a HTTP request for the aURL with a POST sending
	 * aIn body request (or "") and optionally sending aRequestMap headers and optionally specifying 
	 * if the response isBytes and providing an optional custom HTTP aTimeout. 
	 * </odoc>
	 */
	@JSFunction
	public Object post(String url, Object in, NativeObject request, boolean bytes, int timeout) throws IOException {
		return exec(url, "POST", in, request, bytes, timeout);
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.getResponse() : Object</key>
	 * Returns the HTTP request result string or array of bytes. 
	 * </odoc>
	 */
	@JSFunction
	public Object getResponse() {
		return outputObj;
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.getErrorResponse() : Object</key>
	 * Returns the HTTP request error result string. 
	 * </odoc>
	 */
	@JSFunction
	public Object getErrorResponse() {
		return errorObj;
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.responseCode() : Number</key>
	 * Returns the HTTP request response code (e.g. 404, 500, ...)
	 * </odoc>
	 */
	@JSFunction
	public long responseCode() {
		return output.responseCode;
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.responseHeaders() : Map</key>
	 * Returns a Map with the response headers of the HTTP request.
	 * </odoc>
	 */
	@JSFunction
	public Map<String, List<String>> responseHeaders() {
		return output.responseHeaders;
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.responseType() : String</key>
	 * Returns the HTTP request response content mime type.
	 * </odoc>
	 */
	@JSFunction
	public String responseType() {
		return output.contentType;
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.responseBytes() : ArrayOfBytes</key>
	 * Returns the HTTP request result as an array of bytes (if isBytes = true)
	 * </odoc>
	 */
	@JSFunction
	public Object responseBytes() {
		return output.responseBytes;
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.response() : String</key>
	 * Returns the HTTP request result as a string (if isBytes = false or default)
	 * </odoc>
	 */
	@JSFunction
	public String response() {
		return output.response;
	}
	
	/**
	 * <odoc>
	 * <key>HTTP.wsConnect(anURL, onConnect, onMsg, onError, onClose) : WebSocketClient</key>
	 * Tries to establish a websocket connection (ws or wss) and returns a jetty WebSocketClient java object.
	 * As callbacks you should defined onConnect, onMsg, onError and onClose. The onConnect callback will 
	 * provide, as argument, the created session that you should use to send data; the onMsg callback will
	 * provide, as arguments, aType (either "text" or "bytes"), aPayload (string or array of bytes) and an offset
	 * and length (in case type is "bytes"); the onError callback will provide the cause; the onClose callback
	 * will provide aStatusCode and aReason. Example:\
	 * \
	 * plugin("HTTP");\
	 * var session; var output = "";\
	 * var client = (new HTTP()).wsConnect("ws://echo.websocket.org",\
	 *   function(aSession) { log("Connected"); session = aSession; },\
	 *   function(aType, aPayload, aOffset, aLength) { if (aType == "text") output += aPayload; },\
	 *   function(aCause) { logErr(aCause); },\
	 *   function(aStatusCode, aReason) { log("Closed (" + aReason + ")"); }\
	 * );\
	 * session.getRemote().sendString("Hello World!");\
	 * while(output.length &lt; 1) { sleep(100); };\
	 * client.stop();\
	 * print(output);\
	 * \
	 * </odoc>
	 */
	@JSFunction
	public Object wsConnect(String anURL, NativeFunction onConnect, NativeFunction onMsg, NativeFunction onError, NativeFunction onClose) throws Exception {
		URI uri = URI.create(anURL);
		WebSocketClient client = new WebSocketClient();		
		try {
			client.start();
			EventSocket socket = new EventSocket(onConnect, onMsg, onError, onClose);
			Future<Session> fut = client.connect(socket, uri);

			Session session = fut.get();

			return client;
		} catch (Exception e) {
			client.stop();
			throw e;
		}
	}
	
	/**
	 * 
	 * @param aURL
	 * @param method
	 * @param request
	 * @param in
	 * @return
	 * @throws IOException
	 */
	protected HTTPResponse request(String aURL, String method, Object in, Properties request, boolean bytes, int timeout) throws IOException {
		CookieHandler.setDefault(ckman);
		
		URL url = new URL(aURL);
		
		HttpURLConnection con = (HttpURLConnection) url.openConnection();
		con.setRequestMethod(method);
		
		//con.addRequestProperty("Accept-Charset", Charset.defaultCharset().displayName());
		con.addRequestProperty("Accept", "*/*");
		
		if (request != null) {
			for(Object key : request.keySet()) {
				con.addRequestProperty((String) key, (String) request.get(key));
			}
		}
		
		con.setDoInput(true);  
		
		if (!(in instanceof org.mozilla.javascript.Undefined))
			if (in instanceof String) {
				if (!in.equals("")) {
					con.setDoOutput(true);
					IOUtils.write((String) in, con.getOutputStream());
				}
			} else {
				con.setDoOutput(true);
				IOUtils.write((byte[]) in, con.getOutputStream());
			}
				
		if (timeout > 0) con.setConnectTimeout(timeout);
		
		con.connect(); 
		try {
			SimpleLog.log(SimpleLog.logtype.DEBUG, "URL = " + aURL + "; method = " + method + "; responsecode = " + con.getResponseCode() + "; cookiesize = " + ckman.getCookieStore().getCookies().size(), null);
	
			if (bytes) {
				return new HTTPResponse(IOUtils.toByteArray(con.getInputStream()), con.getResponseCode(), con.getHeaderFields(), con.getContentType());
			} else {
				return new HTTPResponse(IOUtils.toString(con.getInputStream()), con.getResponseCode(), con.getHeaderFields(), con.getContentType());
			}
		} catch(Exception e) {
			if (con.getErrorStream() != null) {
				errorObj = IOUtils.toString(con.getErrorStream());
				SimpleLog.log(SimpleLog.logtype.DEBUG, "Response = " + IOUtils.toString(con.getErrorStream()), e);
			}
			throw e;
		}
	}
}