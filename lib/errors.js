'use strict';

var util = require('util');

/**
 * Application wide error codes.
 * @type {ErrorCodes}
 */

// From http://dustinsenos.com/articles/customErrorsInNode
// Create a new Abstract Error constructor
var AbstractError = function (code, msg, constr) {
  // If defined, pass the constr property to V8's
  // captureStackTrace to clean up the output
  Error.call(this);
  Error.captureStackTrace(this, constr || this);

  // If defined, store a custom error message
  this.message = msg || 'Error';

  // if defined store the code
  this.code = code;
};
util.inherits(AbstractError, Error);
AbstractError.prototype.name = 'Abstract Error';



// Create the ApiError
var CypherError = function (msg) {
  var code = msg.code;
  msg = msg.msg;
  CypherError.super_.call(this, code, msg, this.constructor);
};
util.inherits(CypherError, AbstractError);
CypherError.prototype.name = 'Cypher Error';



// Create the DatabaseError
var DatabaseError = function (msg) {
  var code = null;
  DatabaseError.super_.call(this, code, msg, this.constructor);
};
util.inherits(DatabaseError, AbstractError);
DatabaseError.prototype.name = 'Database Error';

// Create the JSONError
var JSONError = function (msg) {
  var code = null;
  JSONError.super_.call(this, code, msg, this.constructor);
};
util.inherits(JSONError, AbstractError);
JSONError.prototype.name = 'JSON Error';

module.exports = {
  CypherError: CypherError,
  DatabaseError: DatabaseError,
  JSONError: JSONError
};