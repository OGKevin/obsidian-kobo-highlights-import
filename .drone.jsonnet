local common = import '.drone-templates/common.libsonnet';
local images = import '.drone-templates/images.libsonnet';
local jsonnet = import '.drone-templates/jsonnet.libsonnet';
local releasePlease = import '.drone-templates/release-please.libsonnet';
local renovate = import '.drone-templates/renovate.libsonnet';

local nodeImage = 'node:20';
local earthlyImage = 'earthly/earthly:v0.7.22';

local koboPipeline = [
  common.defaultPushTrigger + common.platform + {
    kind: 'pipeline',
    name: 'npm',
    type: 'docker',
    steps: [
      {
        name: 'test all',
        image: earthlyImage,
        commands: [
          'earthly config global.tls_enabled $BUILDKIT_TLS_ENABLED',
          'earthly --secret VAULT_TOKEN --buildkit-host $BUILDKIT_HOST --ci +test-all',
        ],
      },
    ],
    volumes: [],
  },
  {
    kind: 'secret',
    name: 'aws',
    get: {
      path: 'secret/data/ci/aws',
      name: 'credentials',
    },
  },
];

renovate + jsonnet + releasePlease + koboPipeline +
[
  x[1]
  for x in common.f.kv(common.secrets)
]
