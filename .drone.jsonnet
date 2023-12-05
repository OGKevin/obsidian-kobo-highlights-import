local common = import '.drone-templates/common.libsonnet';
local images = import '.drone-templates/images.libsonnet';
local jsonnet = import '.drone-templates/jsonnet.libsonnet';
local releasePlease = import '.drone-templates/release-please.libsonnet';
local renovate = import '.drone-templates/renovate.libsonnet';

local nodeImage = 'node:20';

local koboPipeline = [
  common.defaultPushTrigger + common.platform + {
    kind: 'pipeline',
    name: 'npm',
    type: 'docker',
    steps: [
      {
        name: 'set aws credentials',
        image: images.debian.image + ':' + images.debian.version,
        environment: {
          CONFIG: {
            from_secret: 'aws',
          },
        },
        commands: [
          'echo "$CONFIG" > /root/.aws/credentials',
        ],
        volumes: [
          {
            name: 'aws-config',
            path: '/root/.aws',
          },
        ],
      },
      {
        name: 'copy kobo database',
        image: 'docker.io/amazon/aws-cli:2.13.15@sha256:ac2c7d3827a8fef1024357ada9c6ccd8d0ce098a85cffd6803a52bb8cb4842ed',
        commands: [
          'aws --endpoint-url http://100.82.97.39:9000 s3 cp s3://repo-obsidian-kobo-highlights-import/KoboReader.sqlite /drone/src/KoboReader.sqlite',
        ],
        volumes: [
          {
            name: 'aws-config',
            path: '/root/.aws',
          },
        ],
      },
      {
        name: 'install',
        image: nodeImage,
        volumes: [
          {
            name: 'node_modules',
            path: '/drone/src/node_modules',
          },
        ],
        commands: [
          'npm install',
        ],
      },
      {
        name: 'lint',
        image: nodeImage,
        volumes: [
          {
            name: 'node_modules',
            path: '/drone/src/node_modules',
          },
        ],
        commands: [
          'npm run lint',
        ],
        depends_on: [
          'install',
        ],
      },
      {
        name: 'test',
        image: nodeImage,
        volumes: [
          {
            name: 'node_modules',
            path: '/drone/src/node_modules',
          },
        ],
        commands: [
          'npm run test',
        ],
        depends_on: [
          'install',
          'copy kobo database',
        ],
      },
      {
        name: 'build',
        image: nodeImage,
        volumes: [
          {
            name: 'node_modules',
            path: '/drone/src/node_modules',
          },
        ],
        commands: [
          'npm run build',
        ],
        depends_on: [
          'install',
        ],
      },
    ],
    volumes: [
      {
        name: 'node_modules',
        host: {
          path: '/tmp/node_modules/kobo',
        },
      },
      {
        name: 'aws-config',
        temp: {},
      },
    ],
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
