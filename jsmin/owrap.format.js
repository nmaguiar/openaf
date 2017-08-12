OpenWrap.format=function(){return ow.format};
OpenWrap.format.prototype.string={wordWrap:function(b,a,c){c=isUndefined(c)?"\n":c;done=!1;res="";do{found=!1;for(i=a-1;0<=i;i--){var d=b.charAt(i);if((new RegExp(/^\s$/)).test(d.charAt(0))){res+=[b.slice(0,i),c].join("");b=b.slice(i+1);found=!0;break}}found||(res+=[b.slice(0,a),c].join(""),b=b.slice(a));b.length<a&&(done=!0)}while(!done);return res+b},closest:function(b,a,c){isDefined(c);if(!b||!a)return!1;for(var d,e,g=0,f;f=a[g];g++){if(b===f)return b;var m=ow.format.string.distance(b,f);if(!d||
m<d)d=m,e=f}return d>c?!1:e},distance:function(b,a,c){isUndefined(c)&&(c=5);if(!b||!b.length)return a?a.length:0;if(!a||!a.length)return b.length;for(var d=b.length,e=a.length,g=0,f=0,m=0,h=0;g<d&&f<e;){if(b.charAt(g)==a.charAt(f))h++;else{m+=h;h=0;g!=f&&(g=f=Math.max(g,f));for(var k=0;k<c&&(g+k<d||f+k<e);k++){if(g+k<d&&b.charAt(g+k)==a.charAt(f)){g+=k;h++;break}if(f+k<e&&b.charAt(g)==a.charAt(f+k)){f+=k;h++;break}}}g++;f++}return Math.round(Math.max(d,e)-(m+h))},bestPrefix:function(b,a){var c=0,
d=-1,e;for(e in a)-1<b.lastIndexOf(a[e])&&a[e].length>c&&(c=a[e].length,d=e);return a[d]},separatorsToUnix:function(b){return String(Packages.org.apache.commons.io.FilenameUtils.separatorsToUnix(b))},separatorsToWindows:function(b){return String(Packages.org.apache.commons.io.FilenameUtils.separatorsToWindows(b))},leftPad:function(b,a,c){isUndefined(c)&&(c="0");return repeat(a-b.length,c)+b},rightPad:function(b,a,c){isUndefined(c)&&(c="0");return b+repeat(a-b.length,c)},lsHash:function(b,a,c){loadLib(getOpenAFJar()+
"::js/tlsh.js");if(isUndefined(a))return a=new Tlsh,a.update(b),a.finale(),a.hash();var d=new Tlsh;d.update(b);d.finale();b=new Tlsh;b.update(a);b.finale();return d.totalDiff(b,!c)},lsHashDiff:function(b,a,c){loadLib(getOpenAFJar()+"::js/tlsh.js");var d=new Tlsh;d.fromTlshStr(b);b=new Tlsh;b.fromTlshStr(a);return d.totalDiff(b,!c)}};OpenWrap.format.prototype.addNumberSeparator=function(b,a){isUndefined(a)&&(a=",");return b.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g,"$1"+a)};
OpenWrap.format.prototype.fromByte=function(b){return b&255};OpenWrap.format.prototype.toHex=function(b,a){return isDefined(a)?ow.format.string.leftPad(String(java.lang.Long.toHexString(b)),a,"0"):String(java.lang.Long.toHexString(b))};OpenWrap.format.prototype.toOctal=function(b,a){return isDefined(a)?ow.format.string.leftPad(String(java.lang.Long.toOctalString(b)),a,"0"):String(java.lang.Long.toOctalString(b))};
OpenWrap.format.prototype.toBinary=function(b,a){return isDefined(a)?ow.format.string.leftPad(String(java.lang.Long.toBinaryString(b)),a,"0"):String(java.lang.Long.toBinaryString(b))};OpenWrap.format.prototype.fromHex=function(b){return Number(java.lang.Long.parseLong(b,16))};OpenWrap.format.prototype.fromBinary=function(b){return java.lang.Long.parseLong(b,2)};OpenWrap.format.prototype.fromOctal=function(b){return java.lang.Long.parseLong(b,8)};
OpenWrap.format.prototype.toAbbreviation=function(b,a){isUndefined(a)&&(a=2);a=Math.pow(10,a);for(var c=["k","m","b","t"],d=c.length-1;0<=d;){var e=Math.pow(10,3*(d+1));if(e<=b){b=Math.round(b*a/e)/a;1E3===b&&d<c.length-1&&(b=1,d++);b+=c[d];break}d--}return b};OpenWrap.format.prototype.toBytesAbbreviation=function(b,a){isUndefined(a)&&(a=3);var c="bytes KB MB GB TB PB EB ZB YB".split(" "),d=0;if(0!=b){if(1024>b)return Number(b)+" "+c[d];for(;1024<=b;)d++,b/=1024;return b.toPrecision(a)+" "+c[d]}};
OpenWrap.format.prototype.round=function(b,a){isUndefined(a)&&(a=0);return b.toFixed(a)};OpenWrap.format.prototype.timeago=function(b){b=new Date(b);b=Math.floor((new Date-b)/1E3);var a=Math.floor(b/31536E3);if(1<a)return""+a+" years ago";a=Math.floor(b/2592E3);if(1<a)return""+a+" months ago";a=Math.floor(b/86400);if(1<a)return""+a+" days ago";a=Math.floor(b/3600);if(1<a)return""+a+" hours ago";a=Math.floor(b/60);return 1<a?""+a+" minutes ago":0===Math.floor(b)?"Just now":Math.floor(b)+" seconds ago"};
OpenWrap.format.prototype.toDate=function(b,a){a=new java.text.SimpleDateFormat(a);return new Date(a.parse(b).getTime())};OpenWrap.format.prototype.toWedoDate=function(b,a){return{__wedo__type__:"date",content:[this.toDate(b,a)]}};OpenWrap.format.prototype.getActualTime=function(){plugin("XML");plugin("HTTP");return new Date((new XML((new HTTP("http://nist.time.gov/actualtime.cgi")).response())).get("@time")/1E3)};
OpenWrap.format.prototype.fromDate=function(b,a,c){a=new java.text.SimpleDateFormat(a);var d=new java.util.Date;isDefined(c)&&a.setTimeZone(java.util.TimeZone.getTimeZone(c));d.setTime(b.getTime());return String(a.format(d))};OpenWrap.format.prototype.fromWedoDate=function(b,a){if(ow.format.isWedoDate(b))return ow.format.fromDate(new Date(b.content[0]),a)};OpenWrap.format.prototype.fromUnixDate=function(b){return new Date(1E3*Number(b))};
OpenWrap.format.prototype.toUnixDate=function(b){return ow.format.round(b.getTime()/1E3)};OpenWrap.format.prototype.fromWeDoDateToDate=function(b){if(ow.format.isWedoDate(b))return new Date(b.content[0])};OpenWrap.format.prototype.isWedoDate=function(b){return isDefined(b.__wedo__type__)&&"date"==b.__wedo__type__?!0:!1};OpenWrap.format.prototype.escapeString=function(b,a){return b.replace(/([\.$?*|{}\(\)\[\]\\\/\+\^])/g,function(b){return a&&-1!==a.indexOf(b)?b:"\\"+b})};
OpenWrap.format.prototype.escapeHTML=function(b){var a={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;","=":"&#x3D;"};if("string"!==typeof b){if(b&&b.toHTML)return b.toHTML();if(null==b)return"";if(!b)return b+"";b=""+b}return/[&<>"'`=]/.test(b)?b.replace(/[&<>"'`=]/g,function(b){return a[b]}):b};
OpenWrap.format.prototype.dateDiff={inSeconds:function(b,a,c){isUndefined(a)&&(a=new Date);a=a.getTime();b=b.getTime();return c?((a-b)/1E3).toFixed(0):parseInt((a-b)/1E3)},inMinutes:function(b,a,c){isUndefined(a)&&(a=new Date);a=a.getTime();b=b.getTime();return c?((a-b)/6E4).toFixed(0):parseInt((a-b)/6E4)},inHours:function(b,a,c){isUndefined(a)&&(a=new Date);a=a.getTime();b=b.getTime();return c?((a-b)/36E5).toFixed(0):parseInt((a-b)/36E5)},inDays:function(b,a,c){isUndefined(a)&&(a=new Date);a=a.getTime();
b=b.getTime();return c?((a-b)/864E5).toFixed(0):parseInt((a-b)/864E5)},inWeeks:function(b,a,c){isUndefined(a)&&(a=new Date);a=a.getTime();b=b.getTime();return c?((a-b)/6048E5).toFixed(0):parseInt((a-b)/6048E5)},inMonths:function(b,a){isUndefined(a)&&(a=new Date);var c=b.getFullYear(),d=a.getFullYear();b=b.getMonth();return a.getMonth()+12*d-(b+12*c)},inYears:function(b,a){isUndefined(a)&&(a=new Date);return a.getFullYear()-b.getFullYear()}};
OpenWrap.format.prototype.xls={getStyle:function(b,a){var c=b.getCellStyler();b=b.getNewFont();isDefined(a.bold)&&b.setBold(a.bold);isDefined(a.italic)&&b.setItalic(a.italic);isDefined(a.underline)&&b.setUnderline(a.underline);isDefined(a.strikeout)&&b.setStrikeout(a.strikeout);isDefined(a.fontPoints)&&b.setFontHeightInPoints(a.fontPoints);isDefined(a.fontName)&&b.setFontName(a.fontName);isDefined(a.fontColor)&&b.setColor(this.getColor(a.fontColor));isDefined(a.wrapText)&&c.setWrapText(a.wrapText);
isDefined(a.shrinkToFit)&&c.setShrinkToFit(a.shrinkToFit);isDefined(a.backgroundColor)&&c.setFillBackgroundColor(this.getColor(a.backgroundColor));isDefined(a.foregroundColor)&&c.setFillForegroundColor(this.getColor(a.foregroundColor));isDefined(a.borderBottom)&&c.setBorderBottom(this.getBorderStyle(a.borderBottom));isDefined(a.borderLeft)&&c.setBorderLeft(this.getBorderStyle(a.borderLeft));isDefined(a.borderRight)&&c.setBorderRight(this.getBorderStyle(a.borderRight));isDefined(a.borderTop)&&c.setBorderTop(this.getBorderStyle(a.borderTop));
isDefined(a.borderBottom)&&c.setBorderBottom(this.getBorderStyle(a.borderBottom));isDefined(a.borderLeftColor)&&c.setLeftBorderColor(this.getColor(a.borderLeftColor));isDefined(a.borderRightColor)&&c.setRightBorderColor(this.getColor(a.borderRightColor));isDefined(a.borderTopColor)&&c.setTopBorderColor(this.getColor(a.borderTopColor));isDefined(a.borderBottomColor)&&c.setBottomBorderColor(this.getColor(a.borderBottomColor));isDefined(a.rotation)&&c.setRotation(a.rotation);isDefined(a.indention)&&
c.setIndention(a.indention);if(isDefined(a.valign))switch(a.valign){case "top":c.setVerticalAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.VERTICAL_TOP);case "bottom":c.setVerticalAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.VERTICAL_BOTTOM);case "center":c.setVerticalAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.VERTICAL_CENTER);case "justify":c.setVerticalAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.VERTICAL_JUSTIFY)}if(isDefined(a.align))switch(a.align){case "center":c.setAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.ALIGN_CENTER);
case "centerSelection":c.setAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.ALIGN_CENTER_SELECTION);case "fill":c.setAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.ALIGN_FILL);case "general":c.setAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.ALIGN_GENERAL);case "justify":c.setAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.ALIGN_JUSTIFY);case "left":c.setAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.ALIGN_LEFT);case "right":c.setAlignment(Packages.org.apache.poi.ss.usermodel.CellStyle.ALIGN_RIGHT)}c.setFont(b);
return c},autoFilter:function(b,a){b.setAutoFilter(Packages.org.apache.poi.ss.util.CellRangeAddress.valueOf(a))},getColor:function(b){var a=Packages.org.apache.poi.ss.usermodel.IndexedColors,c;switch(b){case "aqua":c=a.AQUA;break;case "auto":c=a.AUTOMATIC;break;case "black":c=a.BLACK;break;case "blue":c=a.BLUE;break;case "blue_grey":c=a.BLUE_GREY;break;case "bright_green":c=a.BRIGHT_GREEN;break;case "brown":c=a.BROWN;break;case "coral":c=a.CORAL;break;case "cornflower_blue":c=a.CORNFLOWER_BLUE;break;
case "dark_blue":c=a.DARK_BLUE;break;case "dark_green":c=a.DARK_GREEN;break;case "dark_red":c=a.DARK_RED;break;case "dark_teal":c=a.DARK_TEAL;break;case "dark_yellow":c=a.DARK_YELLOW;break;case "gold":c=a.GOLD;break;case "green":c=a.GREEN;break;case "grey25":c=a.GREY_25_PERCENT;break;case "grey40":c=a.GREY_40_PERCENT;break;case "grey50":c=a.GREY_50_PERCENT;break;case "grey80":c=a.GREY_80_PERCENT;break;case "indigo":c=a.INDIGO;break;case "lavender":c=a.LAVENDER;break;case "lemon_chiffon":c=a.LEMON_CHIFFON;
break;case "light_blue":c=a.LIGHT_BLUE;break;case "light_cornflower_blue":c=a.LIGHT_CORNFLOWER_BLUE;break;case "light_green":c=a.LIGHT_GREEN;break;case "light_orange":c=a.LIGHT_ORANGE;break;case "light_turquoise":c=a.LIGHT_TURQUOISE;break;case "light_yellow":c=a.LIGHT_YELLOW;break;case "lime":c=a.LIME;break;case "maroon":c=a.MAROON;break;case "olive_green":c=a.OLIVE_GREEN;break;case "orange":c=a.ORANGE;break;case "orchid":c=a.ORCHID;break;case "pale_blue":c=a.PALE_BLUE;break;case "pink":c=a.PINK;
break;case "plum":c=a.PLUM;break;case "red":c=a.RED;break;case "rose":c=a.ROSE;break;case "royal_blue":c=a.ROYAL_BLUE;break;case "sea_green":c=a.SEA_GREEN;break;case "sky_blue":c=a.SKY_BLUE;break;case "tan":c=a.TAN;break;case "teal":c=a.TEAL;break;case "turquoise":c=a.TURQUOISE;break;case "violet":c=a.VIOLET;break;case "white":c=a.WHITE;break;case "yellow":c=a.YELLOW}if(isDefined(c))return c.getIndex()},getBorderStyle:function(b){var a=Packages.org.apache.poi.ss.usermodel.BorderStyle;switch(b){case "dash_dot":return a.DASH_DOT;
case "dash_dot_dot":return a.DASH_DOT_DOT;case "dashed":return a.DASHED;case "dotted":return a.DOTTED;case "double":return a.DOUBLE;case "hair":return a.HAIR;case "medium":return a.MEDIUM;case "medium_dash_dot":return a.MEDIUM_DASH_DOT;case "medium_dash_dot_dot":return a.MEDIUM_DASH_DOT_DOT;case "medium_dashed":return a.MEDIUM_DASHED;case "none":return a.NONE;case "slanted_dash_dot":return a.SLANTED_DASH_DOT;case "thick":return a.THICK;case "thin":return a.THIN}}};
OpenWrap.format.prototype.cron={parse:function(b){function a(a,b,c){return isNaN(a)?h[a]||null:Math.min(+a+(b||0),c||9999)}function c(a){var b={},c;for(c in a)"dc"!==c&&"d"!==c&&(b[c]=a[c].slice(0));return b}function d(a,b,c,d,e){for(a[b]||(a[b]=[]);c<=d;)0>a[b].indexOf(c)&&a[b].push(c),c+=e||1;a[b].sort(function(a,b){return a-b})}function e(a,b,e,f){if(b.d&&!b.dc||b.dc&&0>b.dc.indexOf(f))a.push(c(b)),b=a[a.length-1];d(b,"d",e,e);d(b,"dc",f,f)}function g(a){return-1<a.indexOf("#")||0<a.indexOf("L")}
function f(a,b){return g(a)&&!g(b)?1:a-b}var m=5<b.split(/ +/).length,h={JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12,SUN:1,MON:2,TUE:3,WED:4,THU:5,FRI:6,SAT:7},k={"* * * * * *":"0/1 * * * * *","@YEARLY":"0 0 1 1 *","@ANNUALLY":"0 0 1 1 *","@MONTHLY":"0 0 1 * *","@WEEKLY":"0 0 * * 0","@DAILY":"0 0 * * *","@HOURLY":"0 * * * *"},y={s:[0,0,59],m:[1,0,59],h:[2,0,23],D:[3,1,31],M:[4,1,12],Y:[6,1970,2099],d:[5,1,7,1]};b=function(a){a=a.toUpperCase();return k[a]||a}(b);return function(b){var c=
{schedules:[{}],exceptions:[]};b=b.replace(/(\s)+/g," ").split(" ");var g,k,m;for(g in y)if(k=y[g],(m=b[k[0]])&&"*"!==m&&"?"!==m){m=m.split(",").sort(f);var v,z=m.length;for(v=0;v<z;v++){var u,l,q=m[v];u=c;var t=g,w=k[1],n=k[2],r=k[3],x=u.schedules,p=x[x.length-1];"L"===q&&(q=w-1);null!==(l=a(q,r,n))?d(p,t,l,l):null!==(l=a(q.replace("W",""),r,n))?(q=u,r=p,n={},t={},1===l?(d(r,"D",1,3),d(r,"d",h.MON,h.FRI),d(n,"D",2,2),d(n,"d",h.TUE,h.FRI),d(t,"D",3,3)):(d(r,"D",l-1,l+1),d(r,"d",h.MON,h.FRI),d(n,"D",
l-1,l-1),d(n,"d",h.MON,h.THU),d(t,"D",l+1,l+1)),d(t,"d",h.TUE,h.FRI),q.exceptions.push(n),q.exceptions.push(t)):null!==(l=a(q.replace("L",""),r,n))?e(x,p,l,w-1):2===(u=q.split("#")).length?(l=a(u[0],r,n),e(x,p,l,a(u[1]))):(l=p,p=q.split("/"),q=+p[1],p=p[0],"*"!==p&&"0"!==p&&(p=p.split("-"),w=a(p[0],r,n),n=a(p[1],r,n)||n),d(l,t,w,n,q))}}return c}(m?b:"0 "+b)},isCronMatch:function(b,a){b=ow.format.fromDate(b,"s m H d M u").split(/ /);var c=ow.format.cron.parse(a);if(0<c.exceptions.length)throw"Exceptions "+
stringify(c.exceptions);var d=!1,e=0;isDefined(c.schedules[0].s)&&5<a.split(/ +/).length&&(d=-1<c.schedules[0].s.indexOf(Number(b[e])));e++;isDefined(c.schedules[0].m)&&(d=5<a.split(/ +/).length?d&&-1<c.schedules[0].m.indexOf(Number(b[e])):-1<c.schedules[0].m.indexOf(Number(b[e])));e++;isDefined(c.schedules[0].h)&&(d=d&&-1<c.schedules[0].h.indexOf(Number(b[e])));e++;isDefined(c.schedules[0].D)&&(d=d&&-1<c.schedules[0].D.indexOf(Number(b[e])));e++;isDefined(c.schedules[0].M)&&(d=d&&-1<c.schedules[0].M.indexOf(Number(b[e])));
e++;isDefined(c.schedules[0].d)&&(d=d&&-1<c.schedules[0].d.indexOf(Number(b[e])));return d}};
