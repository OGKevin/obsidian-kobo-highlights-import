VERSION 0.7
FROM debian:12
WORKDIR /workspace

RUN apt update && apt install -y wget jsonnet

dronecli:
    RUN wget https://github.com/harness/drone-cli/releases/latest/download/drone_linux_arm64.tar.gz
    RUN tar -xvf drone_linux_arm64.tar.gz
    RUN mv drone /usr/local/bin/drone
    SAVE ARTIFACT /usr/local/bin/drone

generate-droneci-spec:
    FROM +dronecli

    COPY .drone-templates .drone-templates
    COPY .drone.jsonnet .
    
    RUN jsonnetfmt -i .drone.jsonnet && drone jsonnet  --stream
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
