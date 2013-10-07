# Node2Neo

A Node.js transaction REST API for neo4j.
Node2neo uses the transaction endpoints feature of the Neo4j REST API. This reduces the traffic between the server and neo4j and allows for multiple http requests within the same transaction.

This is intended to be a building block for future modules to add advanced functionality.

NOTE: Neo4j 2.0 is required.

## Installation

    npm install node2neo

## Usage

#### Connecting to the db

```js
var db = require('node2neo')('http://localhost:7474');
```

There are only five methods offered by node2neo:
1. beginTransaction
2. executeStatement
3. commitTransaction
4. removeTransaction
5. getTransactionId (helper)

#### Begin Transaction
To create a transaction use the db.beginTransaction function. The statements provided to the beginTransaction function must match the required neo4j format.

````js
var transStatement = {
  statements: [{
    statement: 'CREATE n:User RETURN n'
  }, {
    statement: 'CREATE o:Person RETURN o'
  }]
}

db.beginTransaction(transStatement, function(err, results){

})
```

You can immediately commit a transaction by passing an options variable with a commmit property

```js
db.beginTransaction(transStatement, { commit: true }, function(err, results){

})
```

The response format for an open transaction is as follows (closed transaction have a different response)

```js
response: {
  results: [{
    commit: '...commit string...',
    transaction: {expires: '...transaction timeout period...'},
    errors: []
    results: [{
      columns: ['n', 'o'],
      data: [{
        row: [{ name: 'MyNode'}, {name: 'YourNode'}]
      }]
    }]

  }]
}
```

#### Execute Statement
To perform another action in the same transaction use the execute Statement function

In order to execute a statement you will need the transaction Id or commit string.
You can use the db.getTransactionId(commitString) helper to get the transaction id from the commit string or just pass in the commit string

```js
db.executeStatement(commit, statements, function(err, results){

})
```

Transaction will expire after  aperiod of time. You can prevent a transaction from expiring by submitting an empty statements array

```js
var statemetns = {
  statements: []
}
db.executeStatement(commit, statements, function(err, results){

})
```

#### Commit a transaction
All of the statements in a transaction are not commited until the whole transaction is committed. You can optionally include some further statements at this point before committing the transaction. The result from a commit is different:


```js
db.commitTransaction(commit, [statements], function(err, results){

})

// if no statement is provided you receive tw empy arrays.
// If a statement was provided the results array would be poopulated as above
{
  "results" : [ ],
  "errors" : [ ]
}
```

#### Remove a transaction
There are two ways to undo a transaction that is in mid progress: let it timeout or tell Neo4j to remove it.

```js
db.removeTransaction(commit, function(err){

})
```

##Licence
MIT