/*! Stream.js v1.6.4 (2016-05-19) */
(function(){"use strict";function a(){}function b(a){this.initialize(a)}function c(a){this.iterator=a}function d(a){this.initialize(a)}function e(a){this.initialize(a)}function f(a){this.initialize(a)}function g(){this.next=null,this.prev=null}function h(b){this.iterator=a.of(b)}function i(a){this.fn=a}function j(a){this.fn=a,this.iterator=null}function k(a){this.fn=a}function l(a){this.prev=null,this.next=null,this.fn=a}function m(a){this.prev=null,this.next=null,this.filter=a.filter,this.finisher=a.finisher,this.merger=a.merger,this.customMerge=u(this.merger),this.buffer=null,this.i=0}function n(a,b){this.begin=a,this.end=b,this.i=0}function o(a){this.consumer=a,this.consoleFn=B(a)}function p(a){this.predicate=a}function q(a){this.predicate=a,this.border=!1}function r(b,c){var d,e=this;u(b)?d=new l(function(){return b.call(F)}):t(b)?(c=c||"",b.endsWith(c)&&(b=b.substring(0,b.length-c.length)),d=new h(b.split(c))):d=new h(b),this.add=function(a){if(null!==d){var b=d;a.prev=b,b.next=a}d=a},this.next=function(){return d.advance()},this.filter=function(){var a=arguments[0];return A(a)?this.add(new k(function(b){return a.test(b)})):z(a)?this.add(new k(function(b){return K(a,b)})):this.add(new k(a)),this},this.filterNull=function(){return this.add(new k(function(a){return null!==a})),this},this.filterFalsy=function(){return this.add(new k(function(a){return Boolean(a).valueOf()})),this},this.map=function(){var a=arguments[0];return t(a)?this.add(new i(J(a))):this.add(new i(a)),this},this.flatMap=function(){var a=arguments[0];return t(a)?this.add(new i(J(a))):this.add(new i(a)),this.add(new j),this},this.sorted=function(a){var b;return b=u(a)?a:t(a)?I(a):H,this.add(new m({finisher:function(a){a.sort(b)}})),this},this.shuffle=function(){return this.add(new m({merger:function(a,b){if(0===b.length)b.push(a);else{var c=Math.floor(Math.random()*b.length),d=b[c];b[c]=a,b.push(d)}}})),this},this.reverse=function(){return this.add(new m({merger:function(a,b){b.unshift(a)}})),this},this.distinct=function(){return this.add(new m({filter:function(a,b,c){return c.indexOf(a)<0}})),this},this.slice=function(a,b){if(a>b)throw"slice(): begin must not be greater than end";return this.add(new n(a,b)),this},this.skip=function(a){return this.add(new n(a,Number.MAX_VALUE)),this},this.limit=function(a){return this.add(new n(0,a)),this},this.peek=function(a){return this.add(new o(a)),this},this.takeWhile=function(){var a=arguments[0];return A(a)?this.add(new p(function(b){return a.test(b)})):z(a)?this.add(new p(function(b){return K(a,b)})):this.add(new p(a)),this},this.dropWhile=function(){var a=arguments[0];return A(a)?this.add(new q(function(b){return a.test(b)})):z(a)?this.add(new q(function(b){return K(a,b)})):this.add(new q(a)),this};var f={};f.toArray=function(){for(var a,b=[];(a=e.next())!==G;)b.push(a);return b},f.findFirst=function(){var a=e.next();return a===G?s.empty():s.ofNullable(a)},f.forEach=function(a){for(var b,c=B(a);(b=e.next())!==G;)a.call(c?console:F,b)},f.min=function(a){var b;b=u(a)?a:t(a)?I(a):H;for(var c,d=null;(c=e.next())!==G;)(null===d||b.call(F,c,d)<0)&&(d=c);return s.ofNullable(d)},f.max=function(a){var b;b=u(a)?a:t(a)?I(a):H;for(var c,d=null;(c=e.next())!==G;)(null===d||b.call(F,c,d)>0)&&(d=c);return s.ofNullable(d)},f.sum=function(a){for(var b,c=a?J(a):function(a){return a},d=0;(b=e.next())!==G;)d+=c.call(F,b);return d},f.average=function(a){for(var b,c=a?J(a):function(a){return a},d=0,f=0;(b=e.next())!==G;)f+=c.call(F,b),d++;return 0===f||0===d?s.empty():s.of(f/d)},f.count=function(){for(var a=0;e.next()!==G;)a++;return a},f.allMatch=function(){var a,b=arguments[0],c=b;for(A(b)?c=function(a){return b.test(a)}:z(b)&&(c=function(a){return K(b,a)});(a=e.next())!==G;){var d=c.call(F,a);if(!d)return!1}return!0},f.anyMatch=function(){var a,b=arguments[0],c=b;for(A(b)?c=function(a){return b.test(a)}:z(b)&&(c=function(a){return K(b,a)});(a=e.next())!==G;){var d=c.call(F,a);if(d)return!0}return!1},f.noneMatch=function(){var a,b=arguments[0],c=b;for(A(b)?c=function(a){return b.test(a)}:z(b)&&(c=function(a){return K(b,a)});(a=e.next())!==G;){var d=c.call(F,a);if(d)return!1}return!0},f.collect=function(a){for(var b,c=a.supplier.call(F),d=!0;(b=e.next())!==G;)c=a.accumulator.call(F,c,b,d),d=!1;return a.finisher&&(c=a.finisher.call(F,c)),c},f.reduce=function(){var a=arguments[0],b=arguments[1];return b?e.collect({supplier:function(){return a},accumulator:b}):g(a)};var g=function(a){var b,c=e.next();if(c===G)return s.empty();for(;(b=e.next())!==G;)c=a.call(F,c,b);return s.ofNullable(c)};f.groupBy=function(){var a=arguments[0];return t(a)&&(a=J(a)),e.collect({supplier:function(){return{}},accumulator:function(b,c){var d=a.call(F,c);return b.hasOwnProperty(d)||(b[d]=[]),void 0===b[d]&&(b[d]=[]),b[d].push(c),b}})},f.toMap=function(){var a=arguments[0];t(a)&&(a=J(a));var b=!1;return arguments.length>1&&(b=arguments[1]),e.collect({supplier:function(){return{}},accumulator:function(c,d){var e=a.call(F,d);if(c.hasOwnProperty(e)){if(!b)throw"duplicate mapping found for key: "+e;return c[e]=b.call(F,c[e],d),c}return c[e]=d,c}})},f.partitionBy=function(){var a=arguments[0];if(u(a))return r(a);if(v(a))return w(a);if(A(a))return r(function(b){return a.test(b)});if(z(a))return r(function(b){return K(a,b)});throw"partitionBy requires argument of type function, object, regexp or number"};var r=function(a){return e.collect({supplier:function(){return{"true":[],"false":[]}},accumulator:function(b,c){var d=a.call(F,c);return b.hasOwnProperty(d)||(b[d]=[]),b[d].push(c),b}})},w=function(a){return e.collect({supplier:function(){return[]},accumulator:function(b,c){if(0===b.length)return b.push([c]),b;var d=b[b.length-1];return d.length===a?(b.push([c]),b):(d.push(c),b)}})};f.joining=function(a){var b="",c="",d="";return a&&(t(a)?d=a:(b=a.prefix||b,c=a.suffix||c,d=a.delimiter||d)),e.collect({supplier:function(){return""},accumulator:function(a,b,c){var e=c?"":d;return a+e+String(b)},finisher:function(a){return b+a+c}})};var x=function(){this.value=e.next()};x.prototype=new a,x.prototype.next=function(){if(this.value===G)return{value:void 0,done:!0};var a=e.next(),b=a===G,c={value:this.value,done:b};return this.value=a,c},f.iterator=function(){return new x};var y=!1,C=function(a){return function(){try{if(y)throw"stream has already been operated upon";return a.apply(e,arguments)}finally{y=!0}}};for(var D in f)f.hasOwnProperty(D)&&(this[D]=C(f[D]));this.indexBy=this.toMap,this.partitioningBy=this.partitionBy,this.groupingBy=this.groupBy,this.each=this.forEach,this.toList=this.toArray,this.join=this.joining,this.avg=this.average,this.sort=this.sorted,this.size=this.count,this.findAny=this.findFirst}function s(a){this.isPresent=function(){return null!==a&&void 0!==a},this.get=function(){if(!this.isPresent())throw"optional value is not present";return a},this.ifPresent=function(b){this.isPresent()&&b.call(a,a)},this.orElse=function(b){return this.isPresent()?a:b},this.orElseGet=function(b){return this.isPresent()?a:b.call(F)},this.orElseThrow=function(b){if(this.isPresent())return a;throw b},this.filter=function(b){if(this.isPresent()){var c=b.call(F,a);return c?this:s.empty()}return this},this.map=function(b){if(this.isPresent()){var c=b.call(F,a);return s.ofNullable(c)}return this},this.flatMap=function(b){return this.isPresent()?b.call(F,a):this}}function t(a){return"[object String]"===L.call(a)}function u(a){return"function"==typeof a||!1}function v(a){return"[object Number]"===L.call(a)}function w(a){return Boolean(D.Set)&&a instanceof Set&&u(a.values)}function x(a){return Boolean(D.Map)&&a instanceof Map&&u(a.values)}function y(a){return Boolean(a)&&u(a.next)}function z(a){return Boolean(a)&&"object"==typeof a}function A(a){return"[object RegExp]"===L.call(a)}function B(a){return D.console?console.log===a||console.warn===a||console.error===a||console.trace===a:!1}function C(a,b){return new r(a,b)}var D="object"==typeof global&&global||this,E="1.6.4",F={},G={};a.of=function(a){return null===a||void 0===a?new f(a):M(a)?new b(a):x(a)||w(a)?new c(a.values()):y(a)?new c(a):z(a)?new d(a):new e(a)},b.prototype=new a,b.prototype.next=function(){if(this.origin>=this.fence)return G;try{return this.data[this.origin]}finally{this.origin++}},b.prototype.initialize=function(a){this.data=a||[],this.origin=0,this.fence=this.data.length},c.prototype=new a,c.prototype.next=function(){if(this.iterator){var a=this.iterator.next();return a.done&&delete this.iterator,a.value}return G},d.prototype=new a,d.prototype.initialize=function(a){this.data=a||{},this.keys=Object.keys(a),this.origin=0,this.fence=this.keys.length},d.prototype.next=function(){if(this.origin>=this.fence)return G;try{var a=this.keys[this.origin];return this.data[a]}finally{this.origin++}},e.prototype=new a,e.prototype.initialize=function(a){this.value=a,this.done=!1},e.prototype.next=function(){return this.done?G:(this.done=!0,this.value)},f.prototype=new a,f.prototype.initialize=function(a){this.value=a,this.done=!0},f.prototype.next=function(){return G},h.prototype=new g,h.prototype.advance=function(){var a=this.iterator.next();return a===G?a:null===this.next?a:this.next.pipe(a)},i.prototype=new g,i.prototype.advance=function(){return this.prev.advance()},i.prototype.pipe=function(a){var b=this.fn.call(F,a);return null===this.next?b:this.next.pipe(b)},j.prototype=new g,j.prototype.advance=function(){if(null===this.iterator)return this.prev.advance();var a=this.iterator.next();return a===G?(this.iterator=null,this.prev.advance()):null===this.next?a:this.next.pipe(a)},j.prototype.pipe=function(b){this.iterator=a.of(b);var c=this.iterator.next();return c===G?this.prev.advance():null===this.next?c:this.next.pipe(c)},k.prototype=new g,k.prototype.advance=function(){return this.prev.advance()},k.prototype.pipe=function(a){var b=this.fn.call(F,a);return b?null===this.next?a:this.next.pipe(a):this.prev.advance()},l.prototype.advance=function(){var a=this.fn.call(F);return this.next.pipe(a)},m.prototype.advance=function(){var a;if(null===this.buffer){for(this.buffer=[];(a=this.prev.advance())!==G;)this.i++;this.finisher&&this.finisher.call(F,this.buffer)}return 0===this.buffer.length?G:(a=this.buffer.shift(),null!==this.next?this.next.pipe(a):a)},m.prototype.pipe=function(a){this.filter&&this.filter.call(F,a,this.i,this.buffer)===!1||(this.customMerge?this.merger.call({},a,this.buffer):this.buffer.push(a))},n.prototype=new g,n.prototype.advance=function(){return this.prev.advance()},n.prototype.pipe=function(a){return this.i>=this.end?G:(this.i++,this.i<=this.begin?this.prev.advance():null===this.next?a:this.next.pipe(a))},o.prototype=new g,o.prototype.advance=function(){return this.prev.advance()},o.prototype.pipe=function(a){return this.consumer.call(this.consoleFn?console:F,a),null===this.next?a:this.next.pipe(a)},p.prototype=new g,p.prototype.advance=function(){return this.prev.advance()},p.prototype.pipe=function(a){var b=this.predicate.call(F,a);return b!==!0?G:null===this.next?a:this.next.pipe(a)},q.prototype=new g,q.prototype.advance=function(){return this.prev.advance()},q.prototype.pipe=function(a){if(!this.border){var b=this.predicate.call(F,a);if(b===!0)return this.prev.advance();this.border=!0}return null===this.next?a:this.next.pipe(a)},r.prototype.toString=function(){return"[object Stream]"},s.prototype.toString=function(){return"[object Optional]"},s.of=function(a){if(null===a||void 0===a)throw"value must be present";return new s(a)},s.ofNullable=function(a){return new s(a)},s.empty=function(){return new s(void 0)};var H=function(a,b){return a===b?0:a>b?1:-1},I=function(a){var b=J(a);return function(a,c){var d=b(a),e=b(c);return H(d,e)}},J=function(a){if(a.indexOf(".")<0)return function(b){return b[a]};var b=a.split(".");return function(a){for(var c=a,d=0;d<b.length;d++){var e=b[d];c=c[e]}return c}},K=function(a,b){if(!z(a))return a===b;if(!z(b))return!1;for(var c in a)if(a.hasOwnProperty(c)){if(!b.hasOwnProperty(c))return!1;var d=a[c],e=b[c],f=K(d,e);if(!f)return!1}return!0},L=Object.prototype.toString,M=function(a){var b=a.length;return"number"==typeof b&&b>=0};C.from=function(a,b){return C(a,b)},C.range=function(a,b){return C.iterate(a,function(a){return a+1}).limit(b-a)},C.rangeClosed=function(a,b){return C.range(a,b+1)},C.of=function(){var a=Array.prototype.slice.call(arguments);return C(a)},C.generate=function(a){return C(a)},C.iterate=function(a,b){var c=!0,d=a;return C(function(){return c?(c=!1,a):d=b.call(F,d)})},C.empty=function(){return C([])},C.VERSION=E,C.NAME="STREAMJS",C.Optional=s;var N;Boolean(D.Stream)&&D.Stream.NAME!==C.NAME&&(N=D.Stream),C.noConflict=function(){return D.Stream=N,C},"undefined"!=typeof module&&module.exports?module.exports=C:"function"==typeof define&&define.amd?define("streamjs",[],function(){return C}):D.Stream=C}).call(this);
//# sourceMappingURL=stream-min.map