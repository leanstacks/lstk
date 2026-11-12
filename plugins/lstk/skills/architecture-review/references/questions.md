# Pillar questions

Original questions grouped by the six Well-Architected pillar names. Each is tagged by the input that can answer it: **[doc]**, **[code]**, or **[both]**. Skip questions the input cannot answer, and list the skipped themes under `Not reviewed`. Record a finding only when a question surfaces a real concern or a notable trade-off.

## Operational excellence

Deploying, running, and understanding the system.

- **Deploy:** Is the whole system defined as code, and can one change be rolled back? [code]
- **Deploy:** Are environments (dev, prod) described, and do they differ on purpose? [both]
- **Observe:** Do functions and services emit logs, metrics, and traces, and is anything alarmed? [code]
- **Observe:** Can someone trace one request across components? [both]
- **Operate:** Is there a stated way to handle failures, such as a dead-letter queue, a runbook, or an owner? [both]
- **Change:** Are tests present for the behavior that matters, and do they run before deploy? [code]

## Security

Who can do what, and where data is exposed. Hand deep analysis to `threat-model` and `cdk-iam-review`.

- **Identity:** Does every entry point authenticate callers, or is each exception stated and justified? [both]
- **Access:** Are roles scoped per workload, or shared and broad? [code]
- **Data:** Is stored and in-transit data protected, and is any store publicly readable? [code]
- **Secrets:** Where do credentials come from, and is any in source? [code]
- **Boundaries:** Are trust boundaries and data classifications named in the design? [doc]
- **Detection:** Would misuse be logged somewhere someone looks? [both]

## Reliability

Behavior under failure and load.

- **Failure:** What happens when a dependency is slow or down? Look for timeouts, retries with limits, and fallbacks. [both]
- **Limits:** Are timeouts, concurrency, and payload sizes set deliberately, or left at a maximum or default? [code]
- **Data:** Are writes safe to retry, and is there a backup or recovery path for each store? [both]
- **Scaling:** Which component hits a limit first, and is that stated? [both]
- **Blast radius:** Can one failing component take down unrelated ones? [both]

## Performance efficiency

Fitting resources to the work.

- **Fit:** Is each compute and storage choice matched to its access pattern? [both]
- **Hot paths:** Is the latency-sensitive path identified, and is it free of avoidable synchronous hops? [both]
- **Sizing:** Are memory, concurrency, and capacity settings chosen or defaulted? [code]
- **Measurement:** Is there a target and a way to check it? [doc]

## Cost optimization

Paying for what is used.

- **Drivers:** What scales the bill (requests, storage, data transfer, idle capacity)? Is it named? [both]
- **Idle:** Is anything provisioned that sits idle between uses? [code]
- **Retention:** Do logs, objects, and backups have a lifetime? [code]
- **Visibility:** Can cost be attributed to this system, for example through tags? [code]

## Sustainability

Using fewer resources for the same outcome.

- **Utilization:** Are resources sized and scheduled to avoid sustained low use? [both]
- **Data:** Is data kept only as long as it is needed? [both]
- **Efficiency:** Do managed or serverless options replace always-on capacity where the workload allows? [both]

## Writing a trade-off

A trade-off entry needs three parts: the choice as made, what it costs, and the condition under which it is fine. Example shape: "Per-request Lambda with a long timeout. Costs a hung request holding a slot for the full timeout. Fine when callers retry safely and the work really needs the time."
