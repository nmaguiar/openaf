// OpenWrap v2
// Author: Nuno Aguiar
// Metrics

OpenWrap.metrics = function() {
	return ow.metrics;
};

OpenWrap.metrics.prototype.__m = {
    mem: () => {
        var res = {
            max: Number(java.lang.Runtime.getRuntime().maxMemory()),
            total: Number(java.lang.Runtime.getRuntime().totalMemory()),
            free: Number(java.lang.Runtime.getRuntime().freeMemory())
        };
        res.used = res.total - res.free;
        return res;
    },
    cpu: () => ({
        load1 : java.lang.System.getProperty("os.name").indexOf("Windows") < 0 ? getCPULoad() : "n/a",
        load2 : java.lang.System.getProperty("os.name").indexOf("Windows") < 0 ? getCPULoad(true) : "n/a",
        cores : getNumberOfCores(),
        _cores: __cpucores
    }),
    oaf: () => {
        var res = {
            libs : __loadedLibs,
            nlibs: Object.keys(__loadedLibs).length,
            nscopes: af.getScopeIds().length,
            preCompileLevel: __preCompileLevel,
            version: getVersion(),
            path   : getOpenAFPath(),
            java   : String(java.lang.System.getProperty("java.version")),
            javapath: String(java.lang.System.getProperty("java.home")),
            init   : __oafInit,
            now    : now(),
            logErr : __clogErr.get(),
            logWarn: __clogWarn.get(),
            cpuCores: __cpucores,
            threadPoolFactor: __threadPoolFactor,
            mainThreadPool: {
                parallelism: __getThreadPool().getParallelism(),
                size: __getThreadPool().getPoolSize(),
                active: __getThreadPool().getActiveThreadCount(),
                running: __getThreadPool().getRunningThreadCount(),
                steals: __getThreadPool().getStealCount(),
                tasks: __getThreadPool().getQueuedTaskCount(),
                queued: __getThreadPool().getQueuedSubmissionCount()
            },
            bottlenecks: (isDef(global.__bottleneck) ? Object.keys(global.__bottleneck).map(r => ({
                name    : r,
                running : global.__bottleneck[r].atomic.get(),
                maxWait : global.__bottleneck[r].attw,
                maxExecs: global.__bottleneck[r].ance
            })) : "n/a"),
            cache: (isDef(global.__$cache) ? Object.keys(global.__$cache).map(r => ({
                name: r,
                chName: global.__$cache[r].name,
                ttl : global.__$cache[r].attl,
                maxSize: global.__$cache[r].msize,
                size: global.__$cache[r].size(),
                hits: ow.ch.__types.cache.__cacheStats[global.__$cache[r].name].hits,
                miss: ow.ch.__types.cache.__cacheStats[global.__$cache[r].name].miss,
                avgExecTime: ow.ch.__types.cache.__cacheStats[global.__$cache[r].name].avg,
            })) : "n/a"),
            rest: (isDef(global.__openaf_rest) ? Object.keys(global.__openaf_rest.urls).map(r => ({
                url: r,
                hits: _$(global.__openaf_rest.urls[r].c).default(0),
                miss: _$(global.__openaf_rest.urls[r].f).default(0)
            })) : "n/a"),
            fns    : ow.metrics.__fnMetrics
        };
        if (isDef(res.fns)) {
            Object.keys(res.fns).map(r => {
                res.fns[r].avg = res.fns[r].sum / (res.fns[r].err + res.fns[r].end);
            });
        }
        return res;
    },
    ojob: () => {
        var res = {};
        if (isDef(ow.oJob)) {
            res = ow.oJob.getLogCh().getAll().map(j => ({
                name : j.name,
                start: j.count,
                //err  : $path(j.log, "[?not_null(error)] | length(@)"),
                //end  : $path(j.log, "[?!not_null(error)] | length(@)"),
                error: j.error,
                sum  : j.totalTime,
                avg  : j.avgTime
            }) );
        }
        return res;
    },
    os: () => ({
        pid    : getPid(),
        name   : String(java.lang.System.getProperty("os.name")),
        host   : String(java.net.InetAddress.getLocalHost().getHostName()),
        ip     : String(java.net.InetAddress.getLocalHost().getHostAddress())
    }),
    threads: () => {
        var res = {
            list  : af.fromJavaArray(java.lang.Thread.getAllStackTraces().keySet().toArray()).map(t => ({
                id      : t.getId(),
                name    : String(t.getName()),
                isAlive : t.isAlive(),
                priority: Number(t.getPriority()),
                state   : String(t.getState())
            })),
            active: Number(java.lang.Thread.activeCount()),
            total : Number(java.lang.Thread.getAllStackTraces().size())
        };
        res.states = {};
        res.list.map(r => {
            if (isUnDef(res.states[r.state])) 
                res.states[r.state] = 1;
            else
                res.states[r.state] += 1;
        });
        return res;
    }
};

/**
 * <odoc>
 * <key>ow.metrics.add(aName, aFunction)</key>
 * Adds aName metric whose values are a map returned by aFunction.
 * </odoc>
 */
OpenWrap.metrics.prototype.add = function(aName, aFn) {
    if (isUnDef(ow.metrics.__m[aName])) {
        ow.metrics.__m[aName] = aFn;
    }
};

/**
 * <odoc>
 * <key>ow.metrics.getSome(anArrayOfNames) : Map</key>
 * Returns just the metrics in the provided anArrayOfNames.
 * </odoc>
 */
OpenWrap.metrics.prototype.getSome = function(aArray) {
    var r = {}, errors = [];
    aArray.map(f => {
        try {
            r[f] = ow.metrics.__m[f]();
        } catch(e) {
            r[f] = "error";
            logErr(e);
        }
    });
    return r;
};

/**
 * <odoc>
 * <key>ow.metrics.getAll() : Map</key>
 * Returns a map with all registered metrics.
 * </odoc>
 */
OpenWrap.metrics.prototype.getAll = function() {
    return ow.metrics.getSome(Object.keys(ow.metrics.__m));
};

/**
 * <odoc>
 * <key>ow.metrics.startCollecting(aChName, aPeriod, some)</key>
 * Starts collecting metrics on aChName (defaults to '__metrics') every aPeriod ms (defaults to 1000ms) optionally just some (array) metrics.
 * </odoc>
 */
OpenWrap.metrics.prototype.startCollecting = function(aChName, aPeriod, aSome) {
    var createCh = isUnDef(aChName) || $ch().list().indexOf(aChName) < 0;

    if (isUnDef(ow.metrics.__fnMetrics)) ow.metrics.__fnMetrics = {};

    aChName = _$(aChName).isString().default("__metrics");
    aPeriod = _$(aPeriod).isNumber().default(1000);

    if (createCh) $ch(aChName).create(1, "mvs", { file: "metrics.db" });

    if (isUnDef(ow.metrics.__ch)) ow.metrics.__ch = [];
    ow.metrics.__ch.push(aChName);

    if (isUnDef(ow.metrics.__t)) {
        plugin("Threads");
        ow.metrics.__t = new Threads();
        ow.metrics.__t.addScheduleThreadWithFixedDelay(function() {
            var k = { t: now() };
            var v;
            if(isArray(aSome))
               v = merge(k, ow.metrics.getSome(aSome)); 
            else
	       v = merge(k, ow.metrics.getAll());
    
            ow.metrics.__ch.map(ch => {
                $ch(ch).set(k, v);
            });
        }, aPeriod);
        ow.metrics.__t.startNoWait();
    }
};

/**
 * <odoc>
 * <key>ow.metrics.stopCollecting(aChName)</key>
 * Stops collecting metrics on aChName (defaults to '__metrics')
 * </odoc>
 */
OpenWrap.metrics.prototype.stopCollecting = function(aChName) {
    aChName = _$(aChName).isString().default("__metrics");
    if (ow.metrics.__ch.indexOf(aChName) < 0) throw "Not collecting into " + aChName;

    ow.metrics.__ch = deleteFromArray(ow.metrics.__ch, ow.metrics.__ch.indexOf(aChName));
    if (isDef(ow.metrics.__t) && ow.metrics.__ch.length <= 0) {
        ow.metrics.__t.stop(true);
        ow.metrics.__t = void 0;
    }
};

/**
 * <odoc>
 * <key>ow.metrics.collectMetrics4Fn(aName, aFn)</key>
 * Adds extra code to an existing aFn to collect functions metrics under the name aName. If the same aName and aFn
 * has been already executed before it will throw an exception "Already collecting for the provided function."
 * </odoc>
 */
OpenWrap.metrics.prototype.collectMetrics4Fn = function(aName, aFn) {
    _$(aName, "name").isString().$_();
    _$(aFn, "fn").isString().$_();

    var aBody = eval(aFn).toString();
    if (isUnDef(ow.metrics.__fnMetrics)) ow.metrics.__fnMetrics = {};
    if (isDef(ow.metrics.__fnMetrics[aName])) throw "Already collecting for the provided function.";

    aBody = aBody.split(/\n/);
    var newBody = [];
    ow.metrics.__fnMetrics[aName] = {
        start: 0,
        err  : 0,
        end  : 0,
        sum  : 0,
        avg  : 0
    };

    for(var ii in aBody) {
        if (ii == 2 || ii == aBody.length -2) {
            if (ii == 2) {
                newBody.push("ow.metrics.__fnMetrics[\"" + aName + "\"].start += 1; var __resMetricsProxyE, __resMetricsProxyR, __resMetricsProxyI = now(); try { __resMetricsProxyR = (()=>{");
            } else {
                newBody.push("})(); ow.metrics.__fnMetrics[\"" + aName + "\"].end += 1; ow.metrics.__fnMetrics[\"" + aName + "\"].sum += (now() - __resMetricsProxyI); return __resMetricsProxyR; } catch(__fnMetricsProxyE) { ow.metrics.__fnMetrics[\"" + aName + "\"].err += 1; throw __fnMetricsProxyE; }");
            }
        }
        newBody.push(aBody[ii]);
    }
    eval(aFn + " = " + newBody.join("\n"));
};

/**
 * <odoc>
 * <key>ow.metrics.collectMetrics(aName, aFunction) : Object</key>
 * Executes aFunction while collecting functions metrics under the name aName. Returns whatever the function returns
 * or throws any exception.
 * </odoc>
 */
OpenWrap.metrics.prototype.collectMetrics = function(aName, aFunction) {
    _$(aName, "name").isString().$_();
    _$(aFunction).isFunction().$_();

    if (isUnDef(ow.metrics.__fnMetrics)) ow.metrics.__fnMetrics = {};
    if (isUnDef(ow.metrics.__fnMetrics[aName])) {
        ow.metrics.__fnMetrics[aName] = {
            start: 0,
            err  : 0,
            end  : 0,
            sum  : 0
        };
    }

    var __resMetricsProxyE, __resMetricsProxyR, __resMetricsProxyI = now(), res;
    try {
        ow.metrics.__fnMetrics[aName].start += 1;
        __resMetricsProxyR = aFunction();
        ow.metrics.__fnMetrics[aName].end += 1; 
        return __resMetricsProxyR;
    } catch(__resMetricsProxyE) {
        ow.metrics.__fnMetrics[aName].err += 1; 
        throw __resMetricsProxyE;
    }
};

/**
 * <odoc>
 * <key>ow.metrics.fromObj2OpenMetrics(aObj, aPrefix, aTimestamp, aHelpMap) : String</key>
 * Given aObj will return a string of open metric (prometheus) metric strings. Optionally you can provide a prefix (defaults to "metric") 
 * and/or aTimestamp (that will be used for all aObj values).
 * </odoc>
 */
OpenWrap.metrics.prototype.fromObj2OpenMetrics = function(aObj, aPrefix, aTimestamp, aHelpMap) {
    var handled = false;
    aPrefix = _$(aPrefix, "prefix").isString().default("metric");

    var _map = (obj, prefix, lbs) => { 
        var ar = [];
        if (isMap(obj)) {
            var keys = Object.keys(obj);
            // build label
            lbs = _$(lbs).default([]);
            var origLbs = clone(lbs);
            keys.map(key => {
                if (!isNumber(obj[key]) && !isBoolean(obj[key]) && isDef(obj[key]) && !isArray(obj[key]) && !isMap(obj[key]) ) lbs.push(key + "=\"" + String(obj[key]) + "\"");
            });
            var lprefix = (lbs.length > 0 ? "{" + lbs.join(",") + "}" : "");
            keys.map(key => {
                if (isDef(obj[key])) {
                    if (isBoolean(obj[key])) ar.push(prefix + "_" + key + lprefix + " " + (obj[key] ? "1" : "0") + " " + (isDef(aTimestamp) ? Number(aTimestamp) : ""));
                    if (isNumber(obj[key])) ar.push(prefix + "_" + key + lprefix + " " + Number(obj[key]) + " " + (isDef(aTimestamp) ? Number(aTimestamp) : ""));
                    if (isMap(obj[key])) ar = ar.concat(_map(obj[key], prefix + "_" + key, clone(lbs)));
                    if (isArray(obj[key])) ar = ar.concat(_arr(obj[key], prefix + "_" + key, clone(lbs)));
                }
            });
            lbs = origLbs;
        }
        return ar;
    };
    var _arr = (obj, prefix, lbs) => { 
        var ar = [];
        if (isArray(obj)) {
            lbs = _$(lbs).default([]);
            for(var i in obj) {
                if (isDef(obj[i])) {
                    var tlbs = clone(lbs);
                    tlbs.push("_id" + "=\"" + String(i) + "\"");
                    if (isMap(obj[i])) ar = ar.concat(_map(obj[i], prefix, tlbs));
                    if (isArray(obj[i])) ar = ar.concat(_arr(obj[i], prefix, tlbs));
                    if (isNumber(obj[i]) || isBoolean(obj[i])) ar = ar.concat(_sim[i], prefix, tlbs);
                }
            }
        }
        return ar;
    };
    var _sim = (obj, prefix) => { 
        var ar = [];
        if (isBoolean(obj)) {
            obj = (obj ? 1 : 0);
        }
        if (isNumber(obj)) {
            ar.push(prefix + " " + Number(aObj) + " " + (isDef(aTimestamp) ? Number(aTimestamp) : ""));
        }
        return ar;
    };

    var ar = [];
    if (isMap(aObj)) {
        handled = true;
        ar = _map(aObj, aPrefix);
    }

    if (isArray(aObj)) {
        handled = true;
        ar = _arr(aObj, aPrefix);
    }

    if (!handled) {
        ar = _sim(aObj, aPrefix);
    }

    if (isDef(aHelpMap) && isMap(aHelpMap)) {
        var far = [];
        ar.map(item => {
            var it = item.match(/^(.+?)(\{| )/);
            if (isDef(it[1]) && isDef(aHelpMap[it[1]])) {
                var h = aHelpMap[it[1]];
                if (isDef(h.text)) far.push("# " + h.text);
                if (isDef(h.help)) far.push("# HELP " + it[1] + " " + h.help);
                if (isDef(h.type)) far.push("# TYPE " + it[1] + " " + h.type);
            }
            far.push(item);
        });
        ar = far;
    }

    return ar.join("\n") + "\n";
};