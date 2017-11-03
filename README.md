# Local State with Apollo Client 2.0

This example is based on the [**React & Apollo**-Quickstart](https://www.graph.cool/docs/quickstart/frontend/react/apollo-tijghei9go/) example from the Graphcool documentation.

## Get started

### 1. Clone example repository

```sh
git clone git@github.com:nikolasburk/client-side-state-with-apollo.git
cd client-side-state-with-apollo
```

### 2. Create Graphcool service with the [Graphcool CLI](https://docs-next.graph.cool/reference/graphcool-cli/overview-zboghez5go)

```sh
# Install Graphcool Framework CLI
npm install -g graphcool

# Create a new service inside a directory called `server`
graphcool init server
```

This created the following file structure in the current directory:

```
.
└── server
    ├── graphcool.yml
    ├── types.graphql
    └── src
        ├── hello.graphql
        └── hello.js
```

### 3. Define data model

Next, you need to define your data model inside the newly created `types.graphql`-file.

Replace the current contents in `types.graphql` with the following type definition (you can delete the predefined `User` type):

```graphql
type Post @model {
  # Required system field
  id: ID! @isUnique # read-only (managed by Graphcool)

  # Optional system fields (remove if not needed)
  createdAt: DateTime! # read-only (managed by Graphcool)
  updatedAt: DateTime! # read-only (managed by Graphcool)

  description: String!
  imageUrl: String!
}
```

### 4. Deploy the GraphQL server

Navigate into the `server` directory and [deploy](https://docs-next.graph.cool/reference/graphcool-cli/commands-aiteerae6l#graphcool-deploy) the service:

```sh
cd server
graphcool deploy
```

When prompted which cluster you want to deploy to, choose any of the **Shared Clusters** options (`shared-eu-west-1`, `shared-ap-northeast-1` or `shared-us-west-2`).

Save the **Service ID** from the output, you'll need it in the next step.


### 5. Connect the frontend app with your GraphQL API

Paste the **Service ID** from the previous step to `./src/index.js` replacing the placeholder `__SERVICE_ID__`:

```js
// replace `__SERVICE_ID__` with the service ID from the previous step
const endpoint = 'https://api.graph.cool/simple/v1/__SERVICE_ID__'
```

> **Note**: If you ever lose your endpoint or sevice ID, you can get access to it again with the `graphcool info` command.

### 6. Install dependencies & run locally

```sh
cd ..
yarn install
yarn start # open http://localhost:3000 in your browser
```


## Client-side State: Query Logging

This example implements a simple logging mechanism that tracks all the queries that have been made when the application is running and stores them in `localStorage`. All the code for the implementation can be found in [index.js](./src/index.js).

It's based on the following schema representing the client-side state:

```graphql
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
}
```

Thanks to [schema stitching](dev.apollodata.com/tools/graphql-tools/schema-stitching.html), it's possible to merge this schema with the remote schema from your Graphcool service:

```js
const mergedSchema = mergeSchemas({
  schemas: [graphcoolSchema, localSchema]
})
```

A dedicated Apollo Link that hooks into the process of sending a request to the server then is responsible to log the operaion name:

```js
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
```

The `ApolloClient` is instantiated with a the above `addToQueryLogLink` and the `mergedLink` which can respond to queries of the remote and local API (and is also the _terminating_ link in the chain):

```js
const client = new ApolloClient({
  link: ApolloLink.from([addToQueryLogLink, mergedLink]),
  cache: new InMemoryCache()
})
```

Thanks to this setup, you can now send queries that ask for data from the remote as well as from the local schema in the same query document:

```graphql
query AllPostsQuery {
  allPosts(orderBy: createdAt_DESC) {
    id
    imageUrl
    description
  }
  queryLog {
    entry {
      name
    }
  } 
}
```














