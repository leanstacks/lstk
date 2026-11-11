# Mermaid examples for ADRs

Use a diagram only when it makes a structural or flow decision clearer than prose. Keep it under about ten nodes.

## Structure: where a new component sits

````markdown
```mermaid
flowchart LR
    Client --> API[Orders API]
    API --> Queue[(SQS queue)]
    Queue --> Worker[Notification worker]
    Worker --> Email[Email provider]
```
````

## Flow: the sequence a decision changes

````markdown
```mermaid
sequenceDiagram
    participant C as Client
    participant A as Orders API
    participant Q as Queue
    C->>A: Create order
    A->>Q: Publish order-created
    A-->>C: 202 Accepted
```
````

Label nodes with roles and components, not people or client names.
