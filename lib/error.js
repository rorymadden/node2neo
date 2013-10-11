/*!
 * Neo4j - Error class
 * MIT Licensed
 */

/**
 * Neo4j error
 *
 * @api private
 * @inherits Error https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error
 */

function Neo4jError (msg) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);
  this.message = msg;
  this.name = 'Neo4j';
}

/*!
 * Inherits from Error.
 */

Neo4jError.prototype = Object.create(Error.prototype);

/*!
 * Module exports.
 */

module.exports = Neo4jError;
