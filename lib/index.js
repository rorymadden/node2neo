'use strict';

var request = require('request');
var through = require('through');
var JSONStream = require('JSONStream');
var Errors = require('./errors');


// helper function to check if a value is a number
function isNumber(o) {
  return ! isNaN(o - 0) && o !== null && o !== '' && o !== false;
}

/**
 * Instantiate the Node2Neo object
 * @param {string} server The url fo the server e.g. http://localhost:7474
 */
function Node2Neo(server) {
  if (!server) {
    server = 'http://localhost:7474';
  }
  this.server = server.replace(/\/$/, ''); // remove trailing /
}

/**
 * Begin a http transaction to Neo4j
 * var db = require('node2neo')('http://localhost:7474')
 * var statements = {
 *   "statements" : [ {
 *     "statement" : "CREATE n RETURN id(n)"
 *   } ]
 * }
 * db.beginTransaction(statements, cb);
 *
 * Execute the transaction immediately
 * var options = {
 *  commit: true
 * }
 * db.beginTransaction(statements, options, cb);
 *
 *
 * @param  {object}   statements The statements object as defined in http://docs.neo4j.org/chunked/milestone/rest-api-transactional.html.
 *                               Contains an array of objects, each containing a statement variable with a cypher statement.
 *                               Optionally may contain a resultDataContents array. Options include row and graph.
 * @param  {object}   options    Options object. Set Options.commit to true to commit the transaction immediately.
 * @param  {Function} callback
 * @return {Object}              Contains a results array and an errors array.
 */
Node2Neo.prototype.beginTransaction = function (statements, options, callback) {

  if (typeof options === 'function') {
    callback = options;
  }

  var commit = '';
  if (options && options.commit) commit = '/commit';

  var req = {
    url: this.server + '/db/data/transaction' + commit,
    headers: {
      'Accept': 'application/json',
      'X-Stream': true
    }
  };

  if (typeof statements !== 'function') {
    req.json = statements;
  }

  request.post(req,
  function (err, res, body) {
    if (err) {
      return callback(err);
    }
    if (body.errors && body.errors.length > 0) {
      return callback(body.errors);
    }

    else return callback(null, body);
  });
};

Node2Neo.prototype.beginTransactionStream = function (statements, options) {

  if (typeof statements === 'undefined') {
    return new Error('You need to provide at least one cypher statement');
  }

  var commit = '';
  if (options && options.commit) commit = '/commit';

  return request
    .post({
      url: this.server + '/db/data/transaction' + commit,
      json: statements,
      headers: {
        'Accept': 'application/json',
        'X-Stream': true
      }
    })
    .on('response', function (res) {
      var self = this;
      if (!(res.statusCode >= 200 && res.statusCode < 300)) {
        self.emit('error', new Errors.DatabaseError('Got response with HTTP code ' + res.statusCode));
      }
      else {
        res.pipe(JSONStream.parse())
          .on('error', function (err) {
            self.emit('error', new Errors.JSONError(err));
          })
          .pipe(through(function (data) {
            console.log('called')
            if (data.errors.length > 0) {
              self.emit('error', new Errors.CypherError(data.errors[0]));
            }
            else {
              self.emit('data', data);
            }
          }));
      }
    });
};


Node2Neo.prototype.query = function (statements) {

  if (typeof statements === 'undefined') {
    return new Error('You need to provide at least one cypher statement');
  }

  return request
    .post({
      url: this.server + '/db/data/transaction/commit',
      json: statements,
      headers: {
        'Accept': 'application/json',
        'X-Stream': true
      }
    })
    .on('error', function (err) {
      return new Errors.DatabaseError(err);
    })
    .pipe(JSONStream.parse())
    .on('error', function (err) {
      return new Errors.JSONError(err);
    })
    .pipe(through(function (data) {
      if (data.errors.length > 0) {
        this.emit('error', data.errors[0]);
      }
      else {
        this.emit('data', data.results[0].data);
      }
    }))
    .on('error', function (err) {
      return new Errors.CypherError(err);
    });
};


/**
 * Execute an additional statement on an existing transaction.
 *
 * Statements have the same syntax as creating a new transaction.
 *
 * @param  {Number/String}   transId    The id / commit string of the transaction.
 * @param  {Object}   statements The statement to be executed.
 * @param  {Function} callback
 * @return {Object}              Contains a results array and an errors array.
 */
Node2Neo.prototype.executeStatement = function (transId, statements, callback) {
  // just resetting the timeout on the transaction
  if (typeof statements === 'function') {
    callback = statements;
    // an empty statements block is used to extend the transaction time
    statements = {
      statements: []
    };
  }

  transId = this.getTransactionId(transId);

  if (!isNumber(transId)) {
    return callback(new Error('You must provide a numeric transaction id.'));
  }

  // request
  //   .post(this.server + '/db/data/transaction/' + transId)
  //   .send(statements)
  //   .set('Accept', 'application/json')
  //   .set('X-Stream', true)
  //   .end(function (err, res) {
  //     if (err) {
  //       return callback(err);
  //     }
  //     if (res.body.errors.length > 0) {
  //       return callback(res.body.errors);
  //     }

  //     else return callback(null, res.body);
  //   });

  request.post({
    url: this.server + '/db/data/transaction/' + transId,
    json: statements,
    headers: {
      'Accept': 'application/json',
      'X-Stream': true
    }
  },
  function (err, res, body) {
    if (err) {
      return callback(err);
    }
    if (body.errors && body.errors.length > 0) {
      return callback(body.errors);
    }

    else return callback(null, body);
  });
};


/**
 * Commit an open transaction, performing all of the statements.
 * You can optionally add additional statemetns at this point as well.
 *
 * @param  {Number/String}   transId    The id / commit string of the transaction.
 * @param  {Object}   statements The statement to be executed.
 * @param  {Function} callback   [description]
 * @return {Object}              Contains a results array and an errors array.
 */
Node2Neo.prototype.commitTransaction = function (transId, statements, callback) {
  if (typeof statements === 'function') {
    callback = statements;
    statements = undefined;
    // return callback(new Error('You need to provide at least one cypher statement'));
  }
  transId = this.getTransactionId(transId);

  if (!isNumber(transId)) {
    return callback(new Error('You must provide a numeric transaction id.'));
  }

  // request
  //   .post(this.server + '/db/data/transaction/' + transId + '/commit')
  //   .send(statements)
  //   .set('Accept', 'application/json')
  //   .set('X-Stream', true)
  //   .end(function (err, res) {
  //     if (err) {
  //       return callback(err);
  //     }
  //     if (res.body.errors.length > 0) {
  //       return callback(res.body.errors);
  //     }

  //     else return callback(null, res.body);
  //   });
  request.post({
    url: this.server + '/db/data/transaction/' + transId + '/commit',
    json: statements || true,
    headers: {
      'Accept': 'application/json',
      'X-Stream': true
    }
  },
  function (err, res, body) {
    if (err) {
      return callback(err);
    }
    if (body.errors && body.errors.length > 0) {
      return callback(body.errors);
    }

    else return callback(null, body);
  });
};


/**
 * Remove an open transaction
 * @param  {Number/String}   transId    The id / commit string of the transaction.
 * @param  {Function} callback
 * @return {Null}
 */
Node2Neo.prototype.removeTransaction = function (transId, callback) {
  transId = this.getTransactionId(transId);
  if (!isNumber(transId)) {
    return callback(new Error('You must provide a numeric transaction id.'));
  }
  // request
  //   .del(this.server + '/db/data/transaction/' + transId)
  //   .set('Accept', 'application/json')
  //   .set('X-Stream', true)
  //   .end(function (err, res) {
  //     if (err) {
  //       return callback(err);
  //     }
  //     if (res.body.errors.length > 0) {
  //       return callback(res.body.errors);
  //     }

  //     else return callback(null, res.status);
  //   });
  request.del({
    url: this.server + '/db/data/transaction/' + transId,
    headers: {
      'Accept': 'application/json',
      'X-Stream': true
    },
    json: true
  },
  function (err, res, body) {
    if (err) {
      return callback(err);
    }
    if (body.errors && body.errors.length > 0) {
      return callback(body.errors);
    }

    else return callback(null, body);
  });
};

Node2Neo.prototype.getTransactionId = function (commit) {
  if (isNumber(commit)) return commit;
  return commit.slice(commit.indexOf('/transaction') + 13, -7);
};

// export variables

module.exports = function (db) {
  return new Node2Neo(db);
};
