'use strict';

var testDatabase = require('./util/database');
var db = require('../').db(testDatabase.url);

var should = require('chai').should();

describe("node2neo", function(){

  var commit, transaction, transId, ids = [];

  it("should create a transaction", function(done){
    var statements = {
      statements: [{
        statement: "CREATE (n:User {name: 'Rory' }) RETURN id(n)"
      }]
    };
    db.beginTransaction(statements, function(err, results){
      should.not.exist(err);
      transId = db.getTransactionId(results.commit);
      commit = results.commit;
      transaction = results.transaction;
      should.exist(results.results);
      should.exist(results.transaction);
      results.errors.should.be.an('array');
      results.errors.length.should.equal(0);

      results.results.length.should.equal(1);
      results.results[0].columns.length.should.equal(1);
      results.results[0].columns[0].should.equal('id(n)');
      results.results[0].data.length.should.equal(1);
      var id = results.results[0].data[0].row[0];
      ids.push(id);

      // validate that the record hasn't been created in the database
      db.beginTransaction({statements:[{statement: "START n = node(" + id + ") RETURN n"}]}, {commit:true},
        function(err, results){
        should.not.exist(err);
        should.exist(results.results);
        Object.keys(results.results[0].data[0].row[0]).length.should.equal(0);
        done();
      })
    });
  });

  it("should add another statement to a transaction", function(done){
    var statements = {
      statements: [{
        statement: "CREATE (o:Person {name:'Cath'}) RETURN id(o)"
      }, {
        statement: "CREATE (p:Person { name: 'Philip' }) RETURN p.name, id(p)"
      }]
    };

    db.executeStatement(transId, statements, function(err, results){
      should.not.exist(err);
      should.exist(results.results);
      should.exist(results.transaction);
      db.getTransactionId(results.commit).should.equal(transId);
      results.errors.should.be.an('array');
      results.errors.length.should.equal(0);

      results.results.length.should.equal(2);
      results.results[0].columns.length.should.equal(1);
      results.results[0].columns[0].should.equal('id(o)');
      results.results[0].data.length.should.equal(1);
      var id1 = results.results[0].data[0].row[0];
      ids.push(id1);
      results.results[1].columns.length.should.equal(2);
      results.results[1].columns[0].should.equal('p.name');
      results.results[1].columns[1].should.equal('id(p)');
      results.results[1].data.length.should.equal(1);
      results.results[1].data[0].row[0].should.equal('Philip');
      var id2 = results.results[1].data[0].row[1];
      ids.push(id2);

      // validate that the record hasn't been created in the database
      db.beginTransaction({statements:[{statement: "START n = node(" + id1 + "), o = node(" + id2 +") RETURN n, o"}]},
        {commit:true}, function(err, results){
        should.not.exist(err);
        should.exist(results.results);
        Object.keys(results.results[0].data[0].row[0]).length.should.equal(0);
        done();
      });
    });
  });

  it("should add another statement to a transaction: commit string", function(done){
    var statements = {
      statements: [{
        statement: "CREATE (z:Person {name:'Zorg'}) RETURN id(z)"
      }]
    };
    db.executeStatement(commit, statements, function(err, results){
      should.not.exist(err);
      should.exist(results.results);
      done();
    });
  });

  it("should extend the timelimit of a transaction", function(done){
    db.executeStatement(transId, function(err, results){
      should.not.exist(err);
      transaction.expires.should.be.below(results.transaction.expires);
      done();
    });
  });

  it("should commit a transaction - with no additional statement", function(done){
    db.commitTransaction(transId, function(err, results){
      should.not.exist(err);
      should.exist(results.results);
      should.not.exist(results.transaction);
      results.errors.should.be.an('array');
      results.errors.length.should.equal(0);
      results.results.length.should.equal(0);

      // validate that the records have been created in the database
      var statement = [];
      for(var i = 0, len = ids.length; i< len; i++){
        statement.push({statement: 'START n' + i + '=node('  +ids[i] + ') RETURN n' +i });
      }
      var statements = {
        statements: statement
      }
      db.beginTransaction(statements, {commit:true}, function(err, results){
        should.not.exist(err);
        should.exist(results.results);
        done();
      });
    });
  });

  it("should create a transaction, and immediately commit", function(done){
    var statements = {
      statements: [{
        statement: "CREATE (n:User {name: 'Rory-again' }) RETURN id(n)"
      }]
    };
    db.beginTransaction(statements, {commit: true}, function(err, results){
      should.not.exist(err);
      should.exist(results.results);
      results.errors.should.be.an('array');
      results.errors.length.should.equal(0);

      results.results.length.should.equal(1);
      results.results[0].columns.length.should.equal(1);
      results.results[0].columns[0].should.equal('id(n)');
      results.results[0].data.length.should.equal(1);

      var id = results.results[0].data[0].row[0];

      // validate that the record hasn't been created in the database
      db.beginTransaction({statements:[{statement: "START n = node(" + id + ") RETURN n"}]}, {commit:true},
        function(err, results){
        should.not.exist(err);
        should.exist(results.results);
        results.results[0].data[0].row[0].name.should.equal('Rory-again');
        done();
      });
    });
  });

  it("should commit a transaction with an additional statement", function(done){
    var statements1 = {
      statements: [{
        statement: "CREATE (n:User {name: 'Rory-third' }) RETURN id(n)"
      }]
    };
    var statements2 = {
      statements: [{
        statement: "CREATE (n:User {name: 'Cath-again' }) RETURN id(n)"
      }]
    };
    db.beginTransaction(statements1, function(err, results){
      should.not.exist(err);
      transId = db.getTransactionId(results.commit);
      db.commitTransaction(transId, statements2, function(err, results){
        should.not.exist(err);
        should.exist(results.results);
        should.not.exist(results.transaction);
        results.errors.should.be.an('array');
        results.errors.length.should.equal(0);

        results.results.length.should.equal(1);
        results.results[0].columns.length.should.equal(1);
        results.results[0].columns[0].should.equal('id(n)');
        results.results[0].data.length.should.equal(1);
        var id = results.results[0].data[0].row[0];

        // validate that the record hasn't been created in the database
        db.beginTransaction({statements:[{statement: "START n = node(" + id + ") RETURN n"}]}, {commit:true},
          function(err, results){
          should.not.exist(err);
          should.exist(results.results);
          results.results[0].data[0].row[0].name.should.equal('Cath-again');
          done();
        });
      });
    });
  });


  it("should rollback a transaction", function(done){
    var statements1 = {
      statements: [{
        statement: "CREATE (n:User {name: 'Cath-third' }) RETURN id(n)"
      }]
    };
    db.beginTransaction(statements1, function(err, results){
      should.not.exist(err);
      transId = db.getTransactionId(results.commit);
      var id = results.results[0].data[0].row[0];
      db.removeTransaction(transId, function(err){
        should.not.exist(err);

        // validate that the record hasn't been created in the database
        db.beginTransaction({statements:[{statement: "START n = node(" + id + ") RETURN n"}]}, {commit:true},
          function(err, results){
          err[0].code.should.equal(42000);
          err[0].message.should.contain('Node with id ');
          should.not.exist(results);
          done();
        });
      });
    });
  });

  it("should error on bad input:beginTransaction", function(done){
    db.beginTransaction({statements:[{statement: "bad cypher syntax"}]}, {commit:true},
      function(err, results){
      err[0].code.should.equal(42001);
      err[0].status.should.equal('STATEMENT_SYNTAX_ERROR');
      should.not.exist(results);
      // statements is not an array
      db.beginTransaction({statements:{statement: "CREATE n RETURN n"}}, {commit:true},
        function(err, results){
        err[0].code.should.equal(40001);
        err[0].status.should.contain('INVALID_REQUEST_FORMAT');
        should.not.exist(results);
        done();
      });
    });
  });

  it("should error on bad input:executeStatement", function(done){
    db.beginTransaction({statements:[{statement: "CREATE n RETURN n"}]}, function(err, results){
      should.not.exist(err);
      transId = db.getTransactionId(results.commit);
      db.executeStatement(transId, {statements:[{statement:"bad syntax"}]}, function(err, results){
        err[0].code.should.equal(42001);
        err[0].status.should.equal('STATEMENT_SYNTAX_ERROR');
        should.not.exist(results);
        // statements is not an array
        db.beginTransaction({statements:{statement: "CREATE n RETURN n"}}, {commit:true},
          function(err, results){
          err[0].code.should.equal(40001);
          err[0].status.should.contain('INVALID_REQUEST_FORMAT');
          should.not.exist(results);
          done();
        });
      });
    });
  });

  it("should error on bad input:removeTransaction", function(done){
    db.removeTransaction(28, function(err){
      err[0].code.should.equal(40010);
      err[0].status.should.equal("INVALID_TRANSACTION_ID");
      done();
    });
  });

  it("should return results in a graph format", function(done){
    db.beginTransaction({statements:[{statement: "MATCH n RETURN n"}], resultDataContents: [ "graph" ]},
      {commit:true}, function(err, results){
      should.not.exist(err);
      should.exist(results.results[0].data[0].graph);
      done();
    });
  });
});