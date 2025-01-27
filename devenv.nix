{ pkgs, ... }:

{
  # https://devenv.sh/basics/
  # env.GREET = "devenv";
  env = {
    SHELLCHECK_OPTS = "-e SC2002";
  };

  # https://devenv.sh/packages/
  packages = with pkgs; [
    git
    vault
    nodejs-slim
    awscli2
    conform
		nodejs_22
  ];

  languages.javascript = {
    enable = true;
    npm.install.enable = true;
  };

  pre-commit.hooks = {
    eslint.enable = true;
    actionlint.enable = true;
    conform.enable = true;
  };

  # https://devenv.sh/scripts/
  # scripts.hello.exec = "echo hello from $GREET";

  enterShell = "";

  # https://devenv.sh/languages/
  # languages.nix.enable = true;

  # https://devenv.sh/processes/
  # processes.ping.exec = "ping example.com";

  # See full reference at https://devenv.sh/reference/options/
}
