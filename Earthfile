VERSION 0.7
FROM debian:12
WORKDIR /workspace

RUN apt update && apt install -y wget jsonnet

vault:
    FROM hashicorp/vault
    ENV VAULT_ADDR="https://vault.ogkevin.nl"
    RUN --secret VAULT_TOKEN vault login $VAULT_TOKEN

node:
    FROM node:20

    WORKDIR /workspace
    
    COPY package.json package-lock.json .
    
    RUN npm install

    COPY .mocharc.json esbuild.config.mjs tsconfig.json .eslintrc .eslintignore .
    COPY src src

creds-aws:
    FROM +vault
    
    RUN vault kv get -mount="secret" -field credentials "ci/aws" > /creds

    SAVE ARTIFACT /creds
    
kobo-test-db:
    FROM docker.io/amazon/aws-cli:2.13.15@sha256:ac2c7d3827a8fef1024357ada9c6ccd8d0ce098a85cffd6803a52bb8cb4842ed
    RUN mkdir -p /root/.aws

    COPY +creds-aws/creds /root/.aws/credentials
    
    RUN aws --endpoint-url http://100.82.97.39:9000 s3 cp s3://repo-obsidian-kobo-highlights-import/KoboReader.sqlite KoboReader.sqlite
    SAVE ARTIFACT KoboReader.sqlite

test:
    FROM +node

    COPY +kobo-test-db/KoboReader.sqlite .
    
    RUN npm run test
    
lint: 
    FROM +node

    RUN npm run lint

build: 
    FROM +node

    RUN npm run build
    SAVE ARTIFACT main.js AS LOCAL main.js
    
test-all:
    BUILD +lint
    BUILD +test
    BUILD +build

dronecli:
    RUN wget https://github.com/harness/drone-cli/releases/latest/download/drone_linux_arm64.tar.gz
    RUN tar -xvf drone_linux_arm64.tar.gz
    RUN mv drone /usr/local/bin/drone
    SAVE ARTIFACT /usr/local/bin/drone

generate-droneci-spec:
    FROM +dronecli
    
    RUN mkdir -p /outputs

    COPY .drone-templates .drone-templates
    COPY .drone.jsonnet .
    
    RUN jsonnetfmt -i .drone.jsonnet 
    RUN drone jsonnet --stream
    
    SAVE ARTIFACT .drone.jsonnet AS LOCAL .drone.jsonnet  
    SAVE ARTIFACT .drone.yml AS LOCAL .drone.yml  

lint-drone-spec:
    FROM +generate-droneci-spec

    RUN drone lint --trusted

sign-drone-spec:
    FROM +dronecli

    ARG DRONE_SERVER=https://drone.ogkevin.nl
    COPY +generate-droneci-spec/.drone.yml .

    RUN --secret DRONE_TOKEN drone sign OGKevin/obsidian-kobo-highlights-import --save
    SAVE ARTIFACT .drone.yml AS LOCAL .drone.yml
