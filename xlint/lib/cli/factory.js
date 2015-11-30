/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
"use strict";

var Factory = {};

Factory.Machine = function(input) {
    this.input = input||null;
};
Factory.Machine.prototype = {
    input: null,
    output: null,
    _action: null,
    _callback: null,
    _breakdown: false
};
Factory.Machine.prototype.constructor = Factory.Machine;

Factory.Machine.prototype.__defineGetter__('action', function(){return this._action;});
Factory.Machine.prototype.__defineSetter__('action', function(value) {if (typeof value === 'function') {this._action = value;}});

Factory.Machine.prototype.do = function() {
    this._breakdown = false;
    this.action(this.input);
};

Factory.Machine.prototype.done = function() {
    if ('function' === typeof this._callback) {
        this._callback(null, this.output);
    }
};

Factory.Machine.prototype.fail = function(msg) {
    if ('function' === typeof this._callback && !this._breakdown) {
        // ensure callback be called only one time during one-time action
        this._breakdown = true;
        this._callback(msg, null);
    }
};

Factory.Line = function (machines, input, cb) {
    this._machines = machines;
    this._callback = cb;
    this.input = input;
    this._assemble();
};
Factory.Line.prototype = {
    input: null,
    _machines: [],
    _currentStation: 0,
    _callback: null
};
Factory.Line.prototype.constructor = Factory.Line;

Factory.Line.prototype.start = function () {
    if (this._machines.length > 0) {
        this._currentStation = 0;
        this._machines[0].input = this.input;
        this._machines[0].do();
    }
};

Factory.Line.prototype._assemble = function () {
    var self = this;
    function machineCallback (err, output) {        
        if (err) {
            self._callback(err, null);
        } else {
            // console.log('\u001b[32mComplete Station ' + self._currentStation + ' -- ' + self._machines[self._currentStation].constructor.name + '\u001b[0m');

            self._currentStation++;
            self._machines[self._currentStation].input = output;
            self._machines[self._currentStation].do();
        }
    }
    
    for (var i = 0, length = this._machines.length; i < length; i++) {
        if (i === length - 1) {
            // last machine
            this._machines[i]._callback = this._callback;
        } else {
            this._machines[i]._callback = machineCallback;
        }
    }
};

Factory.extend = function(Child, Parent) {
    var F = function(){};
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.__super__ = Parent.prototype;
};

Factory.series = function(funcArray, callback) {
    var machines, line;
    if (typeof funcArray !== 'object' || funcArray.constructor !== Array) {
        return;
    }
    machines = [];
    funcArray.forEach(function(func) {
        function Task() {}
        Factory.extend(Task, Factory.Machine);
        Task.prototype.action = function() {
            var self = this;
            func.call(self);
        };
        machines.push(new Task());
    });
    line = new Factory.Line(machines, null, callback?callback:function(){});
    line.start();
};

if (module && "exports" in module) {
    module.exports = Factory;
}