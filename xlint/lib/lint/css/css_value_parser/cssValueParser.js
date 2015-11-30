/*
 * Copyright 2013-2015 Intel Corporation.
 * 
 * See the file LICENSE for copying permission.
 */
var define;
if (typeof define !== 'function') {
    define = require('amdefine')(module);
}
define(function(require) {
    "use strict";
    var cssValueLexer = require('./cssValueLexer');
    cssValueLexer.options.flex = true;

    function lexValue(value) {
        var token, tokens = [];
        cssValueLexer.setInput(value);

        while(true) {
            token = cssValueLexer.lex();
            if (token === cssValueLexer.EOF) {
                break;
            }
            tokens.push([token, cssValueLexer.yytext]);
        }

        return tokens;
    }

    function getValueTypes(value) {
        var index;
        var values = [];
        var funcDepth = 0;
        var tokens = lexValue(value);
        var length = tokens.length;

        function parse(index) {
            var token, funcArgs;
            var values = [];
            while(index < length) {
                token = tokens[index];
                index++;
                switch(token[0]) {
                case 'PXS':
                case 'CMS':
                case 'MMS':
                case 'INS':
                case 'PTS':
                case 'PCS':
                case 'VHS':
                case 'VWS':
                case 'VMINS':
                case 'VMAXS':
                case 'EMS':
                case 'EXS':
                case 'CHS':
                case 'REMS':
                case 'PERCENTAGE':
                case 'HEX':
                case 'DIMEN':
                case 'UNICODERANGE':
                case 'IDENT':
                case 'URI':
                case 'STRING':
                case 'DEGS':
                case 'RADS':
                case 'GRADS':
                case 'TURNS':
                case 'MSECS':
                case 'SECS':
                case 'HERTZ':
                case 'KHERTZ':
                    values.push({type: token[0], value: token[1]});
                    break;
                case 'INTEGER':
                case 'FLOATTOKEN':
                    values.push({type: 'NUMBER', value: token[1]});
                    break;
                case 'FUNCTION':
                    funcDepth++;
                    funcArgs = parse(index);
                    values.push({
                        type: 'FUNCTION',
                        name: token[1].substring(0, token[1].length - 1),
                        args: funcArgs.values
                    });
                    index = funcArgs.index;
                    break;
                case ')':
                    if (funcDepth === 0) {
                        throw 'unexpected ")"';
                    }
                    funcDepth--;
                    return {
                        index: index,
                        values: values
                    };
                case 'IMPORTANT_SYM':
                case 'S':
                    break;
                default:
                }
            }

            if (funcDepth !== 0) {
                throw 'missing ")"';
            }

            return values;
        }

        return parse(0);
    }

    return {
        getValueTypes: getValueTypes
    };

});