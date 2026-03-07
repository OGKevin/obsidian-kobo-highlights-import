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
    conform
    nodejs
    sqlite
  ];

  languages.javascript = {
    enable = true;
    npm.install.enable = true;
  };

  pre-commit.hooks = {
    actionlint.enable = true;
    conform.enable = true;
    eslint.enable = true;
    markdownlint = {
      enable = true;
      settings = {
        configuration = {
          MD007 = false;
          MD013 = false;
          MD024 = false;
          MD030 = false;
          MD033 = false;
          MD040 = false;
          MD045 = false;
          MD051 = false;
        };
      };
    };
    prettier.enable = true;
    yamllint.enable = true;
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
