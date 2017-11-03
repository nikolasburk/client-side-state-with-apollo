import React from 'react'
import ReactDOM from 'react-dom'
import ListPage from './components/ListPage'
import CreatePage from './components/CreatePage'
import DetailPage from './components/DetailPage'
import {BrowserRouter as Router, Route} from 'react-router-dom'
import { ApolloProvider } from 'react-apollo'
import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { Observable, ApolloLink } from 'apollo-link'
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

localStorage.setItem('queryLog', JSON.stringify([]))

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
}`

const resolvers = {
  Query: {
    queryLog: () => {
      return JSON.parse(localStorage.queryLog)
    }
  },
  Mutation: {
    appendToLog: ({name}) => {
      const logEntry = { name }
      const queryLogArray = JSON.parse(localStorage.queryLog)

      queryLogArray.push(logEntry)
      localStorage.queryLog = JSON.stringify(queryLogArray)

      return JSON.parse(localStorage.queryLog)
    }
  },
  QueryLog: {
    entry: data => {
      return data
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

// replace __SERVICE_ID__ with the ID of your own Graphcool service
// more info here: https://www.graph.cool/docs/quickstart/frontend/react/apollo-tijghei9go/
const endpoint = 'https://api.graph.cool/simple/v1/__SERVICE_ID__'
const link = new HttpLink({ uri: endpoint, fetch })

const addToQueryLogLink = (operation, forward) => {

  const { operationName } = operation
  const { queryLog } = localStorage
  const queryLogArray = JSON.parse(queryLog)
  queryLogArray.push({
    name: operationName
  })
  localStorage.queryLog = JSON.stringify(queryLogArray)
  return forward(operation).map(result => {
    console.table(localStorage.queryLog)
    return result
  })

}

introspectSchema(link).then(schema => {

  const graphcoolSchema = makeRemoteExecutableSchema({ schema, link })
  const mergedSchema = mergeSchemas({
    schemas: [graphcoolSchema, localSchema]
  })

  const mergedLink = operation => {
    return new Observable(observer => {
      const { query, variables, operationName } = operation
      graphql(mergedSchema, print(query), {}, {}, variables, operationName)
        .then(result => {
          observer.next(result)
          observer.complete(result)
        })
        .catch(e => observer.error(e))
    })
  }

  const client = new ApolloClient({
    link: ApolloLink.from([addToQueryLogLink, mergedLink]),
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