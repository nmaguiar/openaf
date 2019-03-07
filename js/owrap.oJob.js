/**
 * <odoc>
 * <key>oJob.oJob() : oJob</key>
 * Creates an instance of an oJob. O
 * Uses the channel oJob::log for job logging, oJob::jobs for job register, oJob::todo as
 * job todo register and oJob::oJob for oJob instances registry.
 * </odoc>
 */
OpenWrap.oJob = function() { 
	//startLog();

	this.__host = "local";
	this.__ip = "127.0.0.1";

	try {
		this.__host = String(java.net.InetAddress.getLocalHost().getHostName());
		this.__ip = String(java.net.InetAddress.getLocalHost().getHostAddress());
	} catch(e) {
		logErr(e);
	}

	this.__id = sha256(this.__host + this.__ip);
	this.__threads = {};
	this.__promises = [];
	this.init = void 0;

	ow.loadServer(); 
	this.__sch = new ow.server.scheduler();
	this.__ojob = { recordLog: true, logArgs: false, numThreads: undefined, logToConsole: true };
	this.__expr = processExpr(" ");
	if (isDef(this.__expr[""])) delete this.__expr[""];
	this.__logLimit = 10;

	plugin("Threads");
	ow.loadFormat();

	this.getTodoCh().create(0, "simple");
	this.getJobsCh().create(0, "simple");
	this.getLogCh().create();
	this.getMainCh().create(0, "simple");

	this.getMainCh().set(
		{ "uuid": this.__id },
		{
			"uuid": this.__id,
			"host": this.__host,
			"ip"  : this.__ip,
			"tags": []
		}
	);

	return ow.oJob;
};

/**
 * <odoc>
 * <key>oJob.load(aJobsList, aTodoList, aoJobList, args, aId, init)</key>
 * Loads a set of aJobsList, corresponding aTodoList and a list of aoJobList.
 * Optionally you can provide aId to segment these specific jobs.
 * </odoc>
 */
OpenWrap.oJob.prototype.load = function(jobs, todo, ojob, args, aId, init) {
	if (isUnDef(jobs)) jobs = [];
	if (isUnDef(todo)) todo = [];
	if (isDef(ojob)) this.__ojob = merge(this.__ojob, ojob);

	if (isUnDef(aId) && isDef(this.__ojob.id)) aId = this.__ojob.id;

	for(var i in todo) {
		if (isDef(ojob) && isDef(ojob.sequential) && ojob.sequential && i > 0) {
			var j = $from(jobs).equals("name", (isObject(todo[i]) ? todo[i].name : todo[i])).first();
			if (isDef(j)) {
				if (isUnDef(j.deps)) j.deps = [];
				j.deps.push((isObject(todo[i-1]) ? todo[i-1].name : todo[i-1]));
			}
		}
	}

	if (isDef(init)) this.init = init;
	
	for(var i in jobs) {
		if (isUnDef(jobs[i].from) && isDef(jobs[i].earlier)) jobs[i].from = jobs[i].earlier;
		if (isUnDef(jobs[i].to)   && isDef(jobs[i].then))    jobs[i].to   = jobs[i].then;
		this.addJob(this.getJobsCh(), jobs[i].name, jobs[i].deps, jobs[i].type, jobs[i].typeArgs, jobs[i].args, jobs[i].exec, jobs[i].from, jobs[i].to, jobs[i].help);
	}
	this.addTodos(todo, args, aId);

	if (isDef(ojob.numThreads)) this.__ojob.numThreads = ojob.numThreads;
	if (isDef(ojob.logToConsole)) this.__ojob.logToConsole = ojob.logToConsole;
	if (isDef(ojob.logLimit)) this.__logLimit = ojob.logLimit;
	this.__ojob.async = _$(ojob.async).isBoolean().default(false);

	this.__ojob.tags = _$(ojob.tags).isArray("The ojob.tags needs to be an array.").default([]);
	if (isDef(this.__ojob.tags) && this.__ojob.tags.length > 0) {
		var oj = this.getMainCh().get({ "uuid": this.__id });
		oj.tags = this.__ojob.tags;
		this.getMainCh().set({ "uuid": this.__id }, oj);
	}

	this.__ojob.checkStall = _$(ojob.checkStall).isMap().default(void 0);
	if (isDef(this.__ojob_checkStall)) {
		this.__ojob.checkStall.everySeconds = _$(this.__ojob.checkStall.everySeconds).isNumber("Check stall needs to be a number in seconds.").default(60);
		this.__ojob.checkStall.killAfterSeconds = _$(this.__ojob.checkStall.killAfterSeconds).isNumber("Kill everything after a number of seconds").default(-1);
		this.__ojob.checkStall.checkFunc = _$(this.__ojob.checkStall.checkFunc).isString("Please provide a function to check if should kill or not").default(void 0);
	}

	ojob.logJobs = _$(ojob.logJobs).default(true);
        this.__ojob.logJobs = ojob.logJobs;
	if (isDef(ojob.logToFile) && isMap(ojob.logToFile)) {
		ow.ch.utils.setLogToFile(ojob.logToFile);
	}
	if (isDef(ojob.log) && isMap(ojob.log)) {
		setLog(ojob.log);
	}

	if (isDef(this.__ojob.channels)) {
		if (this.__ojob.channels.recordLog) startLog();
		if (isDef(this.__ojob.channels.create) && isArray(this.__ojob.channels.create)) {
			for(var cI in this.__ojob.channels.create) {
				var cObj = this.__ojob.channels.create[cI]; 
				try {
					_$(cObj).isMap("Each ojob.channels.create entry needs to be a map.")
					_$(cObj.name).$_("Each ojob.channels.create entry needs to have a 'name' entry.");
					cObj.type = _$(cObj.type).isString("Each ojob.channels.create entry might have a string 'type'.").default(void 0);
					cObj.compress = _$(cObj.compress).isBoolean("Each ojob.channels.create entry might have a boolean 'compress' option.").default(void 0);
					cObj.options = _$(cObj.options).isMap("Each ojob.channels.create entry might have a map 'options'").default(void 0);

					$ch(cObj.name).create(cObj.compress, cObj.type, cObj.options);
				} catch(e) {
					logErr("Can't create ojob.channels.create entry #" + cI + ", error: " + String(e));
				}
			}
		}
		if (this.__ojob.channels.expose || isDef(this.__ojob.channels.peers)) {
			if (isDef(this.__ojob.channels.port)) {

				if (isUnDef(this.__hs)) {
					this.__hs = ow.server.httpd.start(this.__ojob.channels.port, this.__ojob.channels.host, this.__ojob.channels.keyStorePath, this.__ojob.channels.keyPassword);
				
					var parent = this;
	
					var auth = function(u, p, s, r) {
						if (isUnDef(parent.__ojob.channels.permissions)) 
							r.channelPermission = "r";
						else
							r.channelPermission = parent.__ojob.channels.permissions;	
						
						return true;				
					};
	
					if (isDef(parent.__ojob.channels.auth)) {
						auth = function(u, p, s, r) {
							if (isUnDef(parent.__ojob.channels.permissions)) 
								r.channelPermission = "r";
							else
								r.channelPermission = parent.__ojob.channels.permissions;
							var creds = $from(parent.__ojob.channels.auth).equals("login", u).at(0);
					
							if (isDef(creds) && isDef(creds.pass) && p == creds.pass) {
								if (isDef(creds.permissions)) r.channelPermission = creds.permissions;
								return true;
							} else {
								return false;
							}
						}
					}
	
					if (isDef(parent.__ojob.channels.audit)) {
						var turnAuditOn = false;
						var OJOB_LOG_AUDIT_TMPL = "AUDIT | User: {{request.user}} | Channel: {{name}} | Operation: {{op}} | Key: {{{key}}}";

						if (isString(parent.__ojob.channels.audit)) {
							OJOB_LOG_AUDIT_TMPL = parent.__ojob.channels.audit;
							turnAuditOn = true;
						} else {
							if (parent.__ojob.channels.audit) {
								turnAuditOn = true;
							}
						}
						if (turnAuditOn) {
							ow.ch.server.setLog(function(aMap) {
								aMap = merge(aMap, { key: stringify(jsonParse(aMap.request.uri.replace(/.+({[^}]+}).*/, "$1").replace(/&quot;/g, "\'")),undefined,"").replace(/\"/g, "") });
								tlog(OJOB_LOG_AUDIT_TMPL, aMap);
							});
						}
					}
					
					if (isUnDef(this.__ojob.channels.list)) {
						this.__ojob.channels.list = $ch().list();
						//this.__ojob.channels.list.push("__log");
					}
	
					var addSuffix = (anArray, suffix) => {
						return $from(anArray).select((r) => { return r + suffix; });
					};

					for(var i in this.__ojob.channels.list) {
						if (this.__ojob.channels.expose) {
							$ch(this.__ojob.channels.list[i]).expose(this.__hs, undefined, auth, undefined, true);
						} else {
							if (isDef(this.__ojob.channels.peers) && isArray(this.__ojob.channels.peers)) {
								$ch(this.__ojob.channels.list[i]).peer(this.__hs, void 0, 
									addSuffix(this.__ojob.channels.peers, "/" + this.__ojob.channels.list[i]),
									auth, void 0);
							}
						}
					}
				}
			}
		}
	}
}

/**
 * <odoc>
 * <key>ow.oJob.loadJSON(aJSON) : Object</key>
 * Loads aJSON oJob configuration and returns the processed map (with all includes processed).
 * </odoc>
 */
OpenWrap.oJob.prototype.loadJSON = function(aJSON) {
	if (!isObject(aJSON)) return {};
	var res = aJSON;

	if (isDef(res.include) && isArray(res.include)) {
		loadLodash();
		res.include = _.uniq(res.include);
		for (var i in res.include) {
			if (res.include[i].match(/\.js$/i)) load(res.include[i]);
			if (res.include[i].match(/\.ya?ml$/i)) res = this.__merge(this.__loadFile(res.include[i]), res);
		}
	}
	
	if (!(isArray(res.ojob)) && !(isArray(res.todo))) {
		throw("ojob and todo entries need to be defined as arrays.");
	}

	return res;
}

OpenWrap.oJob.prototype.__merge = function(aJSONa, aJSONb) {
	var res = { include: [], jobs: [], todo: [], ojob: {}, init: {} };
	
	if (isDef(aJSONa.include) && aJSONa.include != null) 
		res.include = aJSONa.include.concat(isDef(aJSONb.include) ? aJSONb.include : []);
	else
		res.include = isDef(aJSONb.include) ? aJSONb.include : [];

	loadLodash();
	res.include = _.uniq(res.include);

	if (isDef(aJSONa.jobs) && aJSONa.jobs != null) 
		res.jobs = aJSONa.jobs.concat(isDef(aJSONb.jobs) ? aJSONb.jobs : []);
	else
		res.jobs = isDef(aJSONb.jobs) ? aJSONb.jobs : [];
	
	if (isDef(aJSONa.todo) && aJSONa.todo != null) 
		res.todo = aJSONa.todo.concat(isDef(aJSONb.todo) ? aJSONb.todo : []);
	else
		res.todo = isDef(aJSONb.todo) ? aJSONb.todo : [];
	
	if (isDef(aJSONa.ojob)) 
		res.ojob = merge(aJSONa.ojob, aJSONb.ojob);
	else
		res.ojob = isDef(aJSONb.ojob) ? aJSONb.ojob : {};

	if (isDef(aJSONa.init)) 
		res.init = merge(aJSONa.init, aJSONb.init);
	else
		res.init = isDef(aJSONb.init) ? aJSONb.init : {};		
	
	return res;
}

OpenWrap.oJob.prototype.__loadFile = function(aFile) {
	var res = {};

	function _load(aFn) {
		var res = {};
		try {
			res = aFn(aFile);
			return res;
		} catch(e1) {
			if (e1.message.match(/FileNotFoundException/)) {
				var paths = getOPackPaths();
				
				for(var i in paths) {
					try {
						paths[i] = paths[i].replace(/\\+/g, "/");
						paths[i] = paths[i].replace(/\/+/g, "/");
						res = aFn(paths[i] + "/" + aFile);
						return res;
					} catch(e2) {
						if (!e2.message.match(/FileNotFoundException/)) {
							throw e2;
						}
					}
				}
				throw "File not found! (" + aFile + ")";
			} else {
				throw e1;
			}
		}
	}
	
	if (isDef(aFile)) {		
		if (aFile.match(/\.js(on)?$/i)) {
			res = this.__merge(_load(io.readFile), res);
		}
		if (aFile.match(/\.ya?ml$/i)) {
			res = this.__merge(_load(io.readFileYAML), res);
		}
	}

	return this.loadJSON(res);
}

/**
 * <odoc>
 * <key>ow.oJob.loadFile(aFile, args, aId)</key>
 * Loads the configuration from a YAML or JSON aFile and loads all configuration.\
 * Optionally you can provide aId to segment these specific jobs.\
 * \
 * Example of YAML:\
 * # Name your includes\
 * #\
 * include:\
 *   - hello.js   # Some nice hello function\
 * \
 * # Define the jobs\
 * jobs:\
 *    # Start processing\
 *    - name        : Start processing\
 *      exec        : >\
 *         log("init");\
 *         //sprint(ow.oJob.getJobsCh().getAll());\
 * \
 * # Stop processing\
 *    - name        : Stop processing\
 *      type        : shutdown\
 *      exec        : >\
 *         log("done");\
 *         sprint(ow.oJob.getLogCh().getAll());\
 * \
 * # Hello world after start processing\
 *    - name	      : Hello world\
 *      deps          : \
 *         - Start processing\
 *      exec 	      : >\
 *         sprint(args);  \
 *         hello("nuno");\
 * \
 * # Bye world\
 *    - name        : Bye\
 *      deps        :\
 *         - Hello world\
 *         - Say the time\
 *      exec        :\
 *         print("bye, nice to meet you.");\
 * \
 * # Say the time regularly\
 *    - name        : Say the time\
 *      type        : periodic\
 *      typeArgs    :\
 *         timeInterval   : 1000\
 *         waitForFinish  : true\
 *         cron           : "*\/5 * * * * *"\
 *      exec        : >\
 *         print(new Date());\
 * \
 * # List what to do \
 * todo:\
 *    - Start processing\
 *    - Say the time\
 *    - Hello world\
 *    - Bye\
 *    - Stop processing\
 * \
 * # This will be a daemon\
 * ojob:\
 *    daemon: false\
 *    unique:\
 *       pidFile     : helloworld.pid\
 *       killPrevious: true\
 *    channels:\
 *       expose     : true\
 *       port       : 17878\
 *       permissions: r\
 *       #list       :\
 *       #  - oJob::log\
 *       #auth       :\
 *       #  - login: ojob\
 *       #    pass : ojob\
 *       #    permissions: r\
 * \
 * </odoc>
 */
OpenWrap.oJob.prototype.loadFile = function(aFile, args, aId, isSubJob) {
	var s = this.__loadFile(aFile);
	if (isDef(s)) {
		if (isSubJob && isDef(s.ojob)) {
			s.ojob.__subjob = true;
		}
		this.load(s.jobs, s.todo, s.ojob, args, aId, s.init);
	}
}

/**
 * <odoc>
 * <key>ow.oJob.runFile(aFile, args, aId, isSubJob)</key>
 * Loads aFile configuration and executes the oJob defined with the provided args.
 * Optionally you can provide aId to segment these specific jobs.
 * </odoc>
 */
OpenWrap.oJob.prototype.runFile = function(aFile, args, aId, isSubJob) {
	this.loadFile(aFile, args, aId, isSubJob);

	this.start(args, true, aId);
}

/**
 * <odoc>
 * <key>ow.oJob.previewFile(aFile) : Map</key>
  * Returns a map with a preview of the oJob configuration that would be executed with aFile.
 * </odoc>
 */
OpenWrap.oJob.prototype.previewFile = function(aFile) {
	return this.__loadFile(aFile);
}

/**
 * <odoc>
 * <key>ow.oJob.getJobsCh() : Channel</key>
 * Gets the oJob::jobs channel
 * </odoc>
 */
OpenWrap.oJob.prototype.getJobsCh = function() { return $ch("oJob::jobs"); }
/**
 * <odoc>
 * <key>ow.oJob.getTodoCh() : Channel</key>
 * Gets the oJob::todo channel
 * </odoc>
 */
OpenWrap.oJob.prototype.getTodoCh = function() { return $ch("oJob::todo"); }
/**
 * <odoc>
 * <key>ow.oJob.getLogCh() : Channel</key>
 * Gets the oJob::log channel
 * </odoc>
 */
OpenWrap.oJob.prototype.getLogCh = function() { return $ch("oJob::log"); }
/**
 * <odoc>
 * <key>ow.oJob.getMainCh() : Channel</key>
 * Gets the oJob::oJob channel
 * </odoc>
 */
OpenWrap.oJob.prototype.getMainCh = function() { return $ch("oJob::oJob"); }

/**
 * <odoc>
 * <key>oJob.getID() : String</key>
 * Returns this oJob instance ID. Useful to lookup logging in the oJob::log channel.
 * </odoc>
 */
OpenWrap.oJob.prototype.getID = function() {
	return this.__id;
}

/**
 * <odoc>
 * <key>oJob.setJob(aJobName, aJob) : oJob</key>
 * Adds or overwrites an existing aJobName with the configuration aJob.
 * </odoc>
 */
OpenWrap.oJob.prototype.setJob = function(aJobName, aJob) {
	this.getJobsCh().set(aJobName, aJob);
	return this;
}

/**
 * <odoc>
 * <key>oJob.removeJob(aJobName) : oJob</key>
 * Removes aJobName.
 * </odoc>
 */
OpenWrap.oJob.prototype.removeJob = function(aJobName) {
	this.getJobsCh().unset(aJobName);
	return this;
}

/**
 * <odoc>
 * <key>oJob.addTodos(aTodoList, aId) : oJob</key>
 * Adds a new aTodoList array of job names.
 * Optionally you can provide aId to segment these specific jobs.
 * </odoc>
 */
OpenWrap.oJob.prototype.addTodos = function(todoList, aJobArgs, aId) {
	var altId = (isDef(aId) ? aId : "");
	aId = altId;
	for(var i in todoList) {
		if(isDef(aJobArgs) && isObject(todoList[i])) 
			todoList[i].args = this.__processArgs(todoList[i].args, aJobArgs, aId);

		if (isObject(todoList[i])) {
			this.addTodo(this.getID() + altId, this.getJobsCh(), this.getTodoCh(), todoList[i].name, todoList[i].args, todoList[i].type, todoList[i].typeArgs);
		} else {
			this.addTodo(this.getID() + altId, this.getJobsCh(), this.getTodoCh(), todoList[i], undefined, undefined, aJobArgs);
		}
	}
	return this;
}

/**
 * <odoc>
 * <key>oJob.__addLog(aOperation, aJobName, aJobExecId, args, anErrorMessage, aId) : String</key>
 * Adds a new log entry to the channel oJob::log for the aJobName provided for the following operations:\
 * \
 * - start (start of a job)\
 * - success (successfully end of a job)\
 * - error (erroneous end of a job)\
 * - depsfail (job not started do to failed dependencies)\
 * \
 * Optionally, for the operation error, you can provide also anErrorMessage.\
 * Returns the current aJobExecId (or the created one for the operation start).
 * </odoc>
 */
OpenWrap.oJob.prototype.__addLog = function(aOp, aJobName, aJobExecId, args, anException, aId) {
	var aId = (isDef(aId) ? aId : ""); 
		
	var info = {
			"ojobId"      : this.__id + aId,
			"name"        : aJobName,
			"start"       : false,
			"error"       : false,
			"success"     : false,
			"deps"        : false,
			"count"       : 0,
			"totalTime"   : 0,
			"avgTime"     : 0,
			"log"         : []
	};

	var existing = this.getLogCh().get({ "ojobId": this.__id + aId, "name": aJobName });
	if (isUnDef(existing)) {
		info.createDate = now();
		existing = info;
	}

	existing.lastModify = now();
	var currentJobExecId = isUnDef(aJobExecId) ? genUUID() : aJobExecId;

	switch(aOp.toLowerCase()) {
	case "start"   :
		existing.start   = true;
		existing.deps    = true;
		existing.log.push({
			id: currentJobExecId,
			startTime: now()
		})
		break;
	case "success" :
		existing.success = true;
		existing.count++;
		try { 
			var execJob = $from(existing.log).equals("id", currentJobExecId).at(0);
			execJob.endTime = now();
			existing.totalTime += execJob.endTime - execJob.startTime;
			existing.avgTime = existing.totalTime / existing.count;
		} catch(e) {
			logErr("Can't add success log for '" + aJobName + "' for job exec id '" + aJobExecId + "': " + e.message);
		}
		break;
	case "error"   :
		existing.error   = true;
		existing.count++;
		try {
			var execJob = $from(existing.log).equals("id", currentJobExecId).at(0);
			if (isDef(anException.javaException)) {
				var ar = anException.javaException.getStackTrace();
				execJob.error = [ String(anException.javaException) ];
				for(var er in ar) { 
					execJob.error.push(" at "+ ar[er]);
				}
			} else {
				execJob.error = String(anException);
			}
			execJob.endTime  = now();
			existing.totalTime += execJob.endTime - execJob.startTime;
			existing.avgTime = existing.totalTime / existing.count;
		} catch(e) {
			logErr("Can't add error log for '" + aJobName + "' for job exec id '" + aJobExecId + "': " + e.message);
		}
		break;
	case "depsfail":
		existing.deps    = false;
		break;
	default: existing = undefined;
	}

	if (isDef(existing)) {
		if (this.__ojob.logToConsole || this.__ojob.logToFile) {
			var aa = "";
			if (isDef(args) && this.__ojob.logArgs) {
				var temp = clone(args);
				delete temp.objId;
				delete temp.execid;
				aa = "[" + existing.name + "] | " + JSON.stringify(temp) + "\n";
			}

			if (isUnDef(__conAnsi)) __initializeCon();
			var ansis = __conAnsi && (java.lang.System.console() != null);
			try {
				var s = "", ss = "", sn = "";
				var w = (isDef(__con)) ? __con.getTerminal().getWidth() : 80;
				var jansi = JavaImporter(Packages.org.fusesource.jansi);
				
				if (this.__ojob.logToConsole && ansis) {
					jansi.AnsiConsole.systemInstall();
					s  = repeat(w, '-');
					ss = repeat(w, '=');
					sn = "";
				} else {
					s  = repeat(80, '-');
					ss = repeat(80, '=');
					sn = "\n";
				}

				var _c = function(m) { 
					return ansis ? 
							jansi.Ansi.ansi().boldOff().fg(jansi.Ansi.Color.GREEN).a(m).a(jansi.Ansi.Attribute.RESET) 
							: m; 
				};
				
				var _g = function(m) { 
					return ansis ? 
							jansi.Ansi.ansi().boldOff().a(m).a(jansi.Ansi.Attribute.RESET) 
							: m; 
				};

				var _b = function(m) { 
					return ansis ? 
							jansi.Ansi.ansi().bold().a(m).a(jansi.Ansi.Attribute.RESET) 
							: m; 
				};

				var _e = function(m) { 
					return ansis ? 
							jansi.Ansi.ansi().bold().fg(jansi.Ansi.Color.RED).a(m).a(jansi.Ansi.Attribute.RESET) 
							: m; 
				};

				if (existing.name != 'oJob Log') {
					var sep = (isDef(__logFormat) && (isDef(__logFormat.separator))) ? __logFormat.separator : " | ";
					var msg = "[" + existing.name + "]" + sep;
					if (existing.start && (!existing.error && !existing.success)) { 
						var __d = (new Date()).toJSON(); var __n = nowNano();
						var __m = msg + "STARTED" + sep + __d;
						if (this.__ojob.logToConsole) { sync(() => { printnl(_g(aa) + _c(">> ") + _b(__m) + " " + _c(s.substr(0, s.length - __m.length - 2 - 2) + sn)); }); }
						if (isDef(getChLog()) && this.__ojob.logJobs) getChLog().set({ n: nowNano(), d: __d, t: "INFO" }, { n: nowNano(), d: __d, t: "INFO", m: __m });
					}
					if (existing.start && existing.error) { 
						var __d = (new Date()).toJSON(); var __n = nowNano();
						var __m = msg + "Ended in ERROR" + sep + __d;
						if (this.__ojob.logToConsole) { sync(() => { printErr("\n" + _e("!! ") + _g(aa) + _b(__m) + " " + _e(ss.substr(0, ss.length - __m.length - 2 - 2) + sn) + af.toYAML(existing.log) + "\n" + _e(ss)); }); }
						if (isDef(getChLog()) && this.__ojob.logJobs) getChLog().set({ n: nowNano(), d: __d, t: "ERROR" }, { n: nowNano(), d: __d, t: "ERROR", m: __m + "\n" + stringify(existing.log) });
					}
					if (existing.start && existing.success) { 
						var __d = (new Date()).toJSON(); var __n = nowNano();
						var __m = msg + "Ended with SUCCESS" + sep + __d;
						if (this.__ojob.logToConsole) { sync(() => { printnl("\n" + _g(aa) + _c("<< ") + _b(__m) + " " + _c(ss.substr(0, ss.length - __m.length - 2 - 2) + sn)); }); }
						if (isDef(getChLog()) && this.__ojob.logJobs) getChLog().set({ n: nowNano(), d: __d, t: "INFO" }, { n: nowNano(), d: __d, t: "INFO", m: __m });
					}
				}
			} catch(e) { 
				logErr(e); 
			} finally { 
				if (this.__ojob.logToConsole && ansis) jansi.AnsiConsole.systemUninstall(); 
			}
		};

		// Housekeeping
		while (existing.log.length > this.__logLimit) existing.log.shift();

		this.getLogCh().set({ "ojobId": this.__id + aId, "name": aJobName }, existing);
	}

	return currentJobExecId;
}

/**
 * <odoc>
 * <key>oJob.stop()</key>
 * Stops all oJob processing.
 * </odoc>
 */
OpenWrap.oJob.prototype.stop = function() {
	$doWait($doAll(this.__promises));
	this.getLogCh().waitForJobs(3000);
	for(var i in this.__threads) {
		for(var j in this.__threads[i]) {
			this.__threads[i][j].stop(true);
		}
	}
	this.__sch.stop();
	this.mt.stop();
	//stopLog();
};

OpenWrap.oJob.prototype.__mergeArgs = function(a, b) {
	var arep = false, brep = false, r = void 0;
	if (isObject(a) && isDef(a["__oJobRepeat"])) arep = true;
	if (isObject(b) && isDef(b["__oJobRepeat"])) brep = true;

	if (arep && !brep)  { a["__oJobRepeat"] = merge(a["__oJobRepeat"], b); r = a; }
	if (!arep && brep)  { b["__oJobRepeat"] = merge(a, b["__oJobRepeat"]); r = b; }
	if (arep && brep)   { loadLodash(); a["__oJobRepeat"] = _.flatten(merge(a["__oJobRepeat"], b["__oJobRepeat"])); r = a; }
	if (!arep && !brep) { r = merge(a, b); }

	return r;
};

OpenWrap.oJob.prototype.__processTypeArg = function(aTypeArg) {
	if (isString(aTypeArg)) {
		var res;
		try {
			res = eval(aTypeArg);
		} catch(e) {
			res = aTypeArg;
		}
		return res;
	} else {
		return aTypeArg;
	}
};

OpenWrap.oJob.prototype.__processArgs = function(aArgsA, aArgsB, aId, execStr) {
	var argss = {};
	if (isDef(aArgsA)) {
		if (isArray(aArgsA)) {
			argss = this.__mergeArgs(argss, { __oJobRepeat: aArgsA });	
		} else {
			if (isObject(aArgsA)) {
				if (execStr && isDef(aArgsA.__oJobExec)) 
					argss = this.__mergeArgs(argss, this.__processArgs(eval(aArgsA.__oJobExec)));
				else
					argss = this.__mergeArgs(argss, aArgsA);
			} else {
				if (isString(aArgsA)) {
					argss = this.__mergeArgs(argss, { __oJobExec: aArgsA });
				}
			}
		}
	}
	
	if (isDef(aArgsB)) {
		argss = this.__mergeArgs(argss, this.__processArgs(aArgsB));
	}
	
	argss.__id = aId;

	return argss;
}

/**
 * <odoc>
 * <key>oJob.start(args, shouldStop, aId) : oJob</key>
 * Starts the todo list. Optionally you can provide arguments to be used by each job.
 * Optionally you can provide aId to segment these specific jobs.
 * </odoc>
 */
OpenWrap.oJob.prototype.start = function(provideArgs, shouldStop, aId) {
	var args = isDef(provideArgs) ? this.__processArgs(provideArgs, this.__expr, aId) : this.__expr;

	if (isDef(this.init)) args = merge(args, { init: this.init });

	var parent = this;

	if (this.__ojob != {}) {
		if (isDef(this.__ojob.argsFromEnvs) && this.__ojob.argsFromEnvs) args = this.__processArgs(getEnvs(), args, aId);

	    if (isUnDef(this.__ojob.timeInterval)) this.__ojob.timeInterval = 100;

		if (isDef(this.__ojob.id) && isUnDef(aId)) aId = this.__ojob.id;

	    if (isDef(this.__ojob.unique) && !this.__ojob.__subjob) {
	    	if (isUnDef(this.__ojob.unique.pidFile)) this.__ojob.unique.pidFile = "ojob.pid";
	    	if (isUnDef(this.__ojob.unique.killPrevious)) this.__ojob.unique.killPrevious = false;

			var pfile;
			try {
				pfile = eval(this.__ojob.unique.pidFile);
			} catch(e) {
				pfile = this.__ojob.unique.pidFile; 
			}
	    	var s = ow.server.checkIn(pfile, function(aPid) {
	    		if (parent.__ojob.unique.killPrevious || isDef(args.stop) || isDef(args.restart) || isDef(args.forcestop)) {
	    			if (isDef(args.forcestop) || !pidKill(ow.server.getPid(aPid), false)) {
	    				pidKill(ow.server.getPid(aPid), true);
	    			}

		    		var didDie = !(pidCheck(aPid));
		    		
		    		if ((isDef(args.restart) || parent.__ojob.unique.killPrevious) && didDie) {
		    			log("Restarting");
		    			return true;
		    		}
		    		if (isDef(args.stop) || isDef(args.forcestop)) {
		    			if (didDie) {
		    				log("Stopped"); exit(0);
		    			} else {
		    				log("Failed to stop (" + aPid + ")"); exit(-1);
		    			}
		    		}
	    		}
		    	if (isDef(args.status)) {
		    		var pid = ow.server.getPid(aPid);
					var word = (pidCheck(pid) ? "Running on" : "Not running but registered with");
					if (isDef(pid)) log(word + " pid = " + pid);
					return false;
		    	}
		    	
		    	return false;
	    	});
	    	
	    	if (isDef(args.status) && s) {
	    		log("Not running");
	    		exit(0);
	    	}
		}
	}

	var t = new Threads();
	this.mt = new Threads();

	//var parent = this;
	var altId = (isDef(aId) ? aId : "");
	aId = altId;

	if (this.__ojob.daemon != true && isDef(this.__ojob.checkStall) && isNumber(this.__ojob.checkStall.everySeconds) && this.__ojob.checkStall.everySeconds > 0) {
		this.__mtStart = now();
		this.mt.addScheduleThreadAtFixedRate(function() {
			if (isDef(parent.__ojob.checkStall.checkFunc)) {
				var res = (new Function(parent.__ojob.checkStall.checkFunc))(parent.__mtStart);
				if (res) exit(-1);
			}
			if ((now() - parent.__mtStart) > (parent.__ojob.checkStall.killAfterSeconds * 1000)) {
				logErr("oJob: Check stall over " + (parent.__ojob.checkStall.killAfterSeconds * 1000));
				printErr("oJob: Check stall over " + (parent.__ojob.checkStall.killAfterSeconds * 1000));
				exit(-1);
			} 
		}, this.__ojob.checkStall.everySeconds * 1000);
	}

	if (this.__ojob.sequential) {
		var job = void 0;
		var listTodos = $from(this.getTodoCh().getSortedKeys()).equals("ojobId", this.getID() + altId).select();
		while(listTodos.length > 0) {
			var todo = this.getTodoCh().get(listTodos.shift());
			job = this.getJobsCh().get({ name: todo.name });
			var argss = args;
			if (isDef(todo.args)) {
				argss = this.__processArgs(args, todo.args, aId);
			}
			if (isDef(job)) {
				var res = this.runJob(job, argss, aId, true);
				if (res == true) {
					this.getTodoCh().unset({
						"ojobId": todo.ojobId,
						"todoId": todo.todoId
					}, todo);
				}
			} else {
				logErr("Job " + todo.name + " not found!");
				this.getTodoCh().unset({
					"ojobId": todo.ojobId,
					"todoId": todo.todoId
				});
				listTodos = $from(this.getTodoCh().getSortedKeys()).equals("ojobId", this.getID() + altId).select();
			}
		}
	} else {
		t.addThread(function() {
			// Check all jobs in the todo queue
			var job = void 0; 
			var shouldStop = false;
			while(!shouldStop) {
				try {
					var parentOJob = $from(parent.getTodoCh().getKeys()).equals("ojobId", parent.getID() + altId);
					var pjobs = [];
					for (var ipoj = 0; ipoj < parentOJob.count(); ipoj++) {
						var todo = parent.getTodoCh().get(parentOJob.at(ipoj));
						job = parent.getJobsCh().get({ "name": todo.name });
						var argss = args;
						if (isDef(todo.args)) {
							argss = parent.__processArgs(args, todo.args, aId);					
						}
						if (isDef(job)) {
							var res = parent.runJob(job, argss, aId, !(parent.__ojob.async));
							if (res == true) {
								parent.getTodoCh().unset({ 
									"ojobId": todo.ojobId,
								    "todoId": todo.todoId
								}, todo);
							}
						} else {
							logErr("Job " + todo.name + " not found!");
							parent.getTodoCh().unset({
								"ojobId": todo.ojobId,
								"todoId": todo.todoId
							});
						}
					}
					if (!shouldStop && 
						!(isDef(parent.__ojob) && isDef(parent.__ojob.daemon) && parent.__ojob.daemon == true) &&
		                parentOJob.none()
		               ) {
		               	  shouldStop = true;
		               	  try {
						      parent.stop();              		  
		               	  } catch(e) {}
					} 
				} catch(e) { logErr(e); if (isDef(e.javaException)) e.javaException.printStackTrace(); }
				if (isDef(parent.__ojob) && parent.__ojob.daemon == true) 
					sleep((isDef(parent.__ojob.timeInterval) ? parent.__ojob.timeInterval : 100));
				else
					sleep(100);
			}
		});
	}
	
	if (!(this.__ojob.sequential)) t.start();

	if (this.__ojob != {} && this.__ojob.daemon == true && this.__ojob.sequential == true)
		ow.server.daemon();

	if (!(this.__ojob.sequential)) {
		try {
			t.waitForThreads(500);
			t.stop();
		} catch(e) {}
	}

	print("");
};

/**
 * <odoc>
 * <key>ow.oJob.run(providedArgs, aId)</key>
 * Tries to run the current loaded configuration jobs (on the corresponding channels) with
 * the provided arguments (providedArgs).
 * Optionally you can provide aId to segment these specific jobs.
 * </odoc>
 */
OpenWrap.oJob.prototype.run = function(provideArgs, aId) {
	this.start(provideArgs, true, aId);
}

/**
 * <odoc>
 * <key>ow.oJob.runJob(aJob, provideArgs, aId)</key>
 * With jobs defined try to execute/start aJob, with the provideArgs, directly passing any existing todo list. 
 * Optionally you can provide aId to segment this specific jobs.
 * </odoc>
 */
OpenWrap.oJob.prototype.runJob = function(aJob, provideArgs, aId, noAsync) {
	var parent = this;
	var altId = (isDef(aId) ? aId : "");
	aId = altId;

	// Check dep
	var canContinue = true;
	var depInfo = {};
	if (isDef(aJob.deps)) {		
		for(var j in aJob.deps) {
			if (canContinue) {
				try {
					var dep = (isObject(aJob.deps[j]) ? aJob.deps[j].name :  aJob.deps[j]);
					var depInf = this.getLogCh().get({ "ojobId": this.getID() + altId, "name": dep });
					depInfo[dep] = aJob.deps[j];

					if (isDef(depInf) && depInf.success) {
						canContinue = true;
						if (isDef(aJob.deps[j].onSuccess)) {
							var res = (new Function("var args = arguments[0]; var job = arguments[1]; var id = arguments[2];" + aJob.deps[j].onSuccess))(provideArgs, aJob, aId);
							canContinue = res;
						}
						depInfo[dep].result = true;
					} else {
						canContinue = false;
						this.__addLog("depsFail", aJob.name, undefined, provideArgs, undefined, aId);
						if (isDef(aJob.deps[j].onFail) && isDef(depInf) && depInf.error) {
							var res = (new Function("var args = arguments[0]; var job = arguments[1]; var id = arguments[2];" + aJob.deps[j].onFail))(provideArgs, aJob, aId);
							canContinue = res;
						}
						depInfo[dep].result = false;
					}
				} catch(e) {
					logWarn("Issue while trying to process dependency " + stringify(aJob.deps) + ": " + e);
				}
			}
		}
	}

	function _run(aExec, args, job, id) {		
		var f = new Function("var args = arguments[0]; var job = arguments[1]; var id = arguments[2]; var deps = arguments[3]; " + aExec);
		if (isDef(args.__oJobRepeat)) { 
			var errors = [];
			var single = false;
			if (isDef(parent.__ojob.numThreads) && parent.__ojob.numThreads <= 1) single = true;
	        if (isDef(aJob.typeArgs.single)) single = aJob.typeArgs.single;
			if (!single) {
				parallel4Array(args.__oJobRepeat, function(aValue) {
					try {
						f(aValue, job, id, depInfo);
					} catch(e) {
						errors.push(stringify({ args: aValue, exception: e}));
					} finally {
						return true;
					}
				}, parent.__ojob.numThreads);
			} else {
				for(var aVi in args.__oJobRepeat) {
					try {
						f(args.__oJobRepeat[aVi], job, id, depInfo);
					} catch(e) {
						errors.push(stringify({ args: args.__oJobRepeat[aVi], exception: e}));
					}
				}
			}

			if (errors.length > 0) {
				throw errors.join(", ");
			}
		} else {
			f(args, job, id, depInfo);
		}
	}
	
	if (canContinue) {
		var args = isDef(provideArgs) ? this.__processArgs(provideArgs, void 0, aId, true) : {};
		
		args.objId = this.getID() + altId;	
		args = this.__mergeArgs(args, this.__processArgs(aJob.args, void 0, void 0, true));
		if (isUnDef(aJob.typeArgs)) aJob.typeArgs = {};

		switch(aJob.type) {
		case "simple":
			try {
				var uuid = this.__addLog("start", aJob.name, undefined, args, undefined, aId);
				args.execid = uuid;			
				args = this.__mergeArgs(args, aJob.args);
				
				if (noAsync || (isDef(aJob.typeArgs.async) && !aJob.typeArgs.async)) {
					_run(aJob.exec, args, aJob, aId);
					this.__addLog("success", aJob.name, uuid, args, undefined, aId);
				} else {
					parent.__promises.push($do(() => {
						_run(aJob.exec, args, aJob, aId); 
					}).then(() => {
						parent.__addLog("success", aJob.name, uuid, args, void 0, aId);
					}).catch((e) => {
						parent.__addLog("error", aJob.name, uuid, args, e, aId);
					}));
				}
			} catch(e) {
				this.__addLog("error", aJob.name, uuid, args, e, aId);
			}
			return true;
			break;
		case "jobs":
			if (isDef(aJob.typeArgs.file)) {
				aJob.typeArgs.file = this.__processTypeArg(aJob.typeArgs.file);
				try {
					var uuid = parent.__addLog("start", aJob.name, undefined, args, undefined, aId);
					if (isDef(args.__oJobRepeat)) {
						args.execid = uuid;
						args = this.__mergeArgs(args, aJob.args);

						var errors = [];
						if (parent.__ojob.numThreads > 1 && !aJob.typeArgs.single) {
							parallel4Array(args.__oJobRepeat, function(aV) {
								try {
									parent.runFile(aJob.typeArgs.file, aV, aJob.typeArgs.file + md5(stringify(aV)), true);
									return aV;
								} catch(e1) {
									errors.push({ k: aV, e: e1});
								}
							}, parent.__ojob.numThreads);
						} else {
							for(var aVi in args.__oJobRepeat) {
								try {
									parent.runFile(aJob.typeArgs.file, args.__oJobRepeat[aVi], aJob.typeArgs.file + md5(stringify(args.__oJobRepeat[aVi])), true);
									return args.__oJobRepeat[aVi];
								} catch(e1) {
									errors.push({ k: args.__oJobRepeat[aVi], e: e1});
								}								
							}
						}
						if (errors.length > 0) throw stringify(errors);
						this.__addLog("success", aJob.name, uuid, args, undefined, aId);
					} else {
						parent.runFile(aJob.typeArgs.file, args, aJob.typeArgs.file, true);
						this.__addLog("success", aJob.name, uuid, args, undefined, aId);
					}
					return true;
				} catch(e) {
					this.__addLog("error", aJob.name, uuid, args, e, aId);
					return true;
				}
			} else {
				this.__addLog("error", aJob.name, uuid, args, "No typeArgs.file provided.", aId);
				return true;
			}
			break;
		case "shutdown":
			addOnOpenAFShutdown(function() {
				try {
					var uuid = parent.__addLog("start", aJob.name, undefined, args, undefined, aId);
					args.execid = uuid;
					args = parent.__mergeArgs(args, aJob.args);

					_run(aJob.exec, args, aJob, aId);
					parent.__addLog("success", aJob.name, uuid, undefined, aId);
				} catch(e) {
					parent.__addLog("error", aJob.name, uuid, args, e, aId);
				}
			});
			break;
		case "subscribe":
			var subs = function() { 
				return function(aCh, aOp, aK, aV) {	
					uuid = parent.__addLog("start", aJob.name, undefined, args, void 0, aId);
					args.execid = uuid;
					try {
						_run(aJob.exec, parent.__mergeArgs(args, { ch: aCh, op: aOp, k: aK, v: aV }), aJob, aId);
						parent.__addLog("success", aJob.name, uuid, args, undefined, aId);
					} catch(e) {
						parent.__addLog("error", aJob.name, uuid, args, e, aId);
					}

					return true;
				};
			};

			if (isDef(aJob.typeArgs)) {
				if (isDef(aJob.typeArgs.chSubscribe)) {
					$ch(this.__processTypeArg(aJob.typeArgs.chSubscribe)).subscribe(subs());
				}
			}
			break;
		case "periodic":
			var f = function() {
				uuid = parent.__addLog("start", aJob.name, void 0, args, void 0, aId);
				args.execid = uuid;
				try {
					_run(aJob.exec, args, aJob, aId);
					parent.__addLog("success", aJob.name, uuid, args, void 0, aId);
				} catch(e) {
					parent.__addLog("error", aJob.name, uuid, args, e, aId);
				}

				return true;
			};

			//if (isUnDef(aJob.typeArgs)) aJob.typeArgs = {};
			aJob.typeArgs.timeInterval = this.__processTypeArg(aJob.typeArgs.timeInterval);
			if (isDef(aJob.typeArgs.timeInterval) && aJob.typeArgs.timeInterval > 0) {
				var t = new Threads();
				t.addThread(f);

				if (isDef(parent.__threads[aJob.name]))
					parent.__threads[aJob.name].push(t);
				else
					parent.__threads[aJob.name] = [ t ]; 

				aJob.typeArgs.waitForFinish = this.__processTypeArg(aJob.typeArgs.waitForFinish);
				if (isDef(aJob.typeArgs.waitForFinish) && aJob.typeArgs.waitForFinish)
					t.startWithFixedRate(aJob.typeArgs.timeInterval);
				else
					t.startAtFixedRate(aJob.typeArgs.timeInterval);
			} else {
				if (isDef(aJob.typeArgs.cron)) {
					aJob.typeArgs.cron = this.__processTypeArg(aJob.typeArgs.cron);
					/*if (isUnDef(parent.__sch)) {
						ow.loadServer(); 
						parent.__sch = new ow.server.scheduler();
					}*/
					if (isUnDef(parent.__schList)) {
						parent.__schList = {};
					}
					if (isDef(parent.__schList[aJob.name])) {
				        if ((parent.__sch.__entries[parent.__schList[aJob.name]].cron != aJob.typeArgs.cron) ||
						    (parent.__sch.__entries[parent.__schList[aJob.name]].exec != aJob.exec)) {
							parent.__schList[aJob.name] = parent.__sch.modifyEntry(parent.__schList[aJob.name], aJob.typeArgs.cron, f, aJob.typeArgs.waitForFinish);
						}
					} else {
						parent.__schList[aJob.name] = parent.__sch.addEntry(aJob.typeArgs.cron, f, aJob.typeArgs.waitForFinish);
					}
				}
			}
			break;
		}
	} else {
		return false;
	}

	return true;
};

/**
 * <odoc>
 * <key>ow.oJob.addJob(aJobsCh, aName, jobDeps, jobType, aJobTypeArgs, jobArgs, jobFunc, jobFrom, jobTo, jobHelp)</key>
 * Provided aJobsCh (a jobs channel) adds a new job with the provided aName, an array of jobDeps (job dependencies),
 * a jobType (e.g. simple, periodic, shutdown), aJobTypeArgs (a map), jobArgs and a jobFunc (a job function). 
 * Optionally you can inherit the job definition from a jobFrom and/or jobTo name ("from" will execute first, "to" will execute after).
 * Also you can include jobHelp.
 * </odoc>
 */
OpenWrap.oJob.prototype.addJob = function(aJobsCh, aName, jobDeps, jobType, jobTypeArgs, jobArgs, jobFunc, jobFrom, jobTo, jobHelp) {
	jobDeps = _$(jobDeps).isArray().default([]);
    jobType = _$(jobType).isString().default("simple");
	jobFunc = _$(jobFunc).default(function() {});
	jobHelp = _$(jobHelp).isString().default("");

	var j = [];
	var fstr = jobFunc.toString();
	
	if (isDef(jobFrom)) {
		if (isString(jobFrom)) jobFrom = [ jobFrom ];
		_$(jobFrom).isArray();

		for(let jfi in jobFrom) {
			var f = aJobsCh.get({ "name": jobFrom[jfi] });
			if (isDef(f)) {
				j.type = _$(j.type).isString().default(f.type);
				j.typeArgs = (isDef(j.typeArgs) ? merge(j.typeArgs, f.typeArgs) : f.typeArgs);
				j.args = (isDef(j.args) ? this.__processArgs(j.args, f.args) : this.__processArgs(f.args));
				j.deps = (isDef(j.deps) && j.deps != null ? j.deps.concat(f.deps) : f.deps);
				j.exec = (isDef(j.exec) ? j.exec : "") + "\n" + f.exec;
				j.help = (isDef(j.help) ? j.help : "") + "\n" + f.help;
			} else {
				logWarn("Didn't found from/earlier job '" + jobFrom[jfi] + "' for job '" + aName + "'");
			}
		}
	}
	
	j = {
		"name": aName,
		"type": jobType,
		"typeArgs": (isDef(j.typeArgs) ? merge(j.typeArgs, jobTypeArgs) : jobTypeArgs),
        "args": (isDef(j.args) ? this.__processArgs(j.args, jobArgs) : this.__processArgs(jobArgs)),
		"deps": (isDef(j.deps) && j.deps != null ? j.deps.concat(jobDeps) : jobDeps),
		"exec": (isDef(j.exec) ? j.exec : "") + "\n" + fstr,
		"help": (isDef(j.help) ? j.help : "") + "\n" + jobHelp,
		"from": jobFrom,
		"to"  : jobTo
	};	

	if (isDef(jobTo)) {
		if (isString(jobTo)) jobTo = [ jobTo ];
		_$(jobTo).isArray();

		for(let jfi in jobTo) {
			var f = aJobsCh.get({ "name": jobTo[jfi] });
			if (isDef(f)) {
				j.type = (isDef(f.type) ? f.type : j.type);
				j.typeArgs = (isDef(f.typeArgs) ? merge(j.typeArgs, f.typeArgs) : j.typeArgs);
				j.args = (isDef(f.args) ? this.__processArgs(j.args, f.args) : this.__processArgs(j.args));
				j.deps = (isDef(f.deps) && j.deps != null ? j.deps.concat(f.deps) : j.deps);
				j.exec = j.exec + "\n" + (isDef(f.exec) ? f.exec : "");
				j.help = j.help + "\n" + (isDef(f.help) ? f.help : "");
			} else {
				logWarn("Didn't found to/then job '" + jobTo[jfi] + "' for job '" + aName + "'");
			}
		}
	}

	aJobsCh.set({
		"name": aName
	}, j);
}

/**
 * <odoc>
 * <key>ow.oJob.addTodo(aOJobID, aJobsCh, aTodoCh, aJobName, aJogArgs, aJobType, aJobTypeArgs)</key>
 * Provided aOJobID (a oJob instance), aJobsCh (a jobs channel), aTodoCh (a todo channel), aJobArgs (job arguments).
 * Optionally you can force the aJobType and aJobTypeArgs.
 * </odoc>
 */
OpenWrap.oJob.prototype.addTodo = function(aOJobID, aJobsCh, aTodoCh, aJobName, aJobArgs, aJobType, aJobTypeArgs) {
	var todoId = genUUID();
 
	var job = aJobsCh.get({ "name": aJobName });
	if (isUnDef(job) || job == {}) throw "Job '" + aJobName + "' wasn't found.";

	var jobType = (isUnDef(aJobType)) ? job.type : aJobType;
	var jobTypeArgs = (isUnDef(aJobType)) ? job.typeArgs : aJobTypeArgs;

	aTodoCh.set({
		"ojobId"    : aOJobID,
		"todoId"    : todoId
	}, {
		"ojobId"      : aOJobID,
		"todoId"      : todoId,
		"name"        : aJobName,
		"args"        : aJobArgs,
		"type"        : jobType,
		"typeArgs"    : jobTypeArgs
	});

	return todoId;	
}

ow.oJob = new OpenWrap.oJob();
