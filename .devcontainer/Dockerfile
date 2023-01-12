# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 18, 16, 14, 18-bullseye, 16-bullseye, 14-bullseye, 18-buster, 16-buster, 14-buster
ARG VARIANT=18-bullseye@sha256:93d647c8e067cf91f0e8d3a6a02ad4415af394eeec4c4c2fe7793bdfa6583b97
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${VARIANT}

ARG WATCHEXEC_VERSION=1.20.5

# RUN cd /tmp \ 
#     && wget https://github.com/watchexec/watchexec/releases/download/cli-v${WATCHEXEC_VERSION}/watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-gnu.deb \
#     && sudo dpkg -i watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-gnu.deb \
#     && cd -

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    # && apt-get -y install --no-install-recommends watchexec

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"
