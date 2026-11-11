# STRIDE prompts

Per-element prompts. Apply the section that matches the element's kind. Ask each prompt, and record a threat only when the code, infrastructure, or doc shows a credible path. A prompt with no evidence is not a threat. Move it to **Assumptions to verify** or drop it.

Letters: **S** spoofing, **T** tampering, **R** repudiation, **I** information disclosure, **D** denial of service, **E** elevation of privilege.

## Web API (REST or HTTP endpoint)

- **S:** Does every route authenticate the caller? Which routes have no authorizer, and is that stated and intended?
- **T:** Is the request body validated before use? Can a caller alter another caller's resource by changing an id in the path?
- **R:** Are requests logged with a caller identity, so an action can be traced?
- **I:** Do error responses or logs expose internals, other users' data, or identifiers?
- **D:** Are there throttles, quotas, and payload size limits? What does one expensive request cost?
- **E:** Does authorization check ownership or role per route, or only that a token exists?

## Queue or event bus

- **S:** Who may publish? Can a producer pretend to be another?
- **T:** Can a message be altered in flight or replayed? Is the consumer idempotent?
- **R:** Is the origin of a message recorded?
- **I:** Do messages carry sensitive data, and who may read the queue?
- **D:** Can a flood fill the queue or starve the consumer? Is there a dead-letter path and a retry limit?
- **E:** Does consuming a message trigger privileged work without checking the sender?

## Data store (table, bucket, database)

- **S:** Which principals may connect or assume access?
- **T:** Which principals may write or delete? Is versioning or a backup in place?
- **R:** Are data access events logged?
- **I:** Is the store publicly readable or shared across tenants? Is data encrypted at rest, and who holds the key?
- **D:** Can a caller cause unbounded growth or hot partitions?
- **E:** Can write access to the store change code or configuration that runs elsewhere?

## Lambda or compute

- **S:** What can invoke it, and is the trigger authenticated?
- **T:** Does it trust event fields without validation? Does it write to stores with a broader role than it needs?
- **R:** Does it log the decisions it makes with the caller identity?
- **I:** Does it hold secrets in source or environment variables, and does it log them or the payload?
- **D:** Are the timeout, memory, and concurrency bounded? Can one invocation run for the maximum time?
- **E:** Is its role scoped to this function, or shared and broad? Hand role detail to `cdk-iam-review`.

## Identity (user pool, roles, tokens, keys)

- **S:** How are users and workloads authenticated? Are token lifetimes and sources checked?
- **T:** Can a token or key be forged or replaced?
- **R:** Are sign-in and permission changes logged?
- **I:** Where do secrets and signing keys live? Report the location and the kind only, never the value.
- **D:** Can an attacker lock out users or exhaust sign-in capacity?
- **E:** Can a user gain a role or group they were not given? Are administrative paths separate?
