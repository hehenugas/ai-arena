// Generates the supervisord [program:static-*] block for every model listed in
// aggregator/models.json. The Dockerfile runs this at image build time, so the
// ports the container listens on can never disagree with the port map in
// PORT_RULES.md. Not meant to be run on the host.
//
//   node docker/gen-models-conf.mjs aggregator/models.json /out/models.conf

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [, , modelsPath, outPath] = process.argv;
if (!modelsPath || !outPath) {
  console.error("usage: gen-models-conf.mjs <models.json> <out.conf>");
  process.exit(1);
}

const models = JSON.parse(readFileSync(modelsPath, "utf8"));
if (!Array.isArray(models) || models.length === 0) {
  throw new Error(`${modelsPath}: expected a non-empty JSON array`);
}

const blocks = models.map(
  (model) => `
[program:static-${model.id}]
command=/usr/sbin/httpd -f -p 127.0.0.1:${model.port} -h /srv/models/${model.id}
priority=10
autostart=true
autorestart=true
startsecs=1
stopasgroup=true
killasgroup=true
stdout_logfile=/dev/null
redirect_stderr=true
`,
);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, blocks.join(""));
console.log(
  `supervisord static programs: ${models.length}, ports ${models[0].port}-${models[models.length - 1].port}`,
);
