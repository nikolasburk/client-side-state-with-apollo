import React from 'react'
import ReactDOM from 'react-dom'
import ListPage from './components/ListPage'
import CreatePage from './components/CreatePage'
import DetailPage from './components/DetailPage'
import {BrowserRouter as Router, Route} from 'react-router-dom'
import { ApolloProvider } from 'react-apollo'
import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { Observable } from 'apollo-link'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { graphql, print } from 'graphql'
import { 
  makeRemoteExecutableSchema, 
  makeExecutableSchema, 
  mergeSchemas, 
  introspectSchema 
} from 'graphql-tools'
import 'tachyons'
import './index.css'

let state = {
 queryLog: [{
  name: 'asd'
 }]
}

const typeDefs = `
schema {
  query: Query
  mutation: Mutation
}

type Query {
  queryLog: QueryLog
}

type QueryLog {
  entry: [QueryLogEntry!]!
}

type QueryLogEntry {
  name: String
}

type Mutation {
  appendToLog(name: String!): QueryLog
}`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    queryLog: () => {
      return state
    }
  },
  Mutation: {
    appendToLog: ({name}) => {
      const logEntry = { name }
      state.queryLog.push(logEntry)
      return state
    }
  },
  QueryLog: {
    entry: data => {
      return data.queryLog
    }
  },
  QueryLogEntry: {
    name: data => {
      return data.name
    }
  }
}

const localSchema = makeExecutableSchema({
  typeDefs: [typeDefs],
  resolvers
})

const endpoint = 'https://api.graph.cool/simple/v1/cj9iqxzyv3orw01244c4dpes7'
const link = new HttpLink({ uri: endpoint, fetch })

introspectSchema(link).then(schema => {

  const graphcoolSchema = makeRemoteExecutableSchema({ schema, link })
  const mergedSchema = mergeSchemas({
    schemas: [graphcoolSchema, localSchema]
  })

  const mergedLink = operation => {
    return new Observable(observer => {
      const { query, variables, operationName } = operation
      console.log(`Create for operation: `, operation)
      graphql(mergedSchema, print(query), {}, {}, variables, operationName)
        .then(result => {
          console.log(`Query result: `, result)
          observer.next(result)
          observer.complete(result)
        })
        .catch(e => observer.error(e))
    })
  }

  const client = new ApolloClient({
    link: mergedLink,
    cache: new InMemoryCache()
  })

  ReactDOM.render(
    <ApolloProvider client={client}>
      <Router>
        <div>
          <Route exact path='/' component={ListPage} />
          <Route path='/create' component={CreatePage} />
          <Route path='/post/:id' component={DetailPage} />
        </div>
      </Router>
    </ApolloProvider>,
    document.getElementById('root'),
  )

})
