{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
    pkgs.redis
  ];

  env = {};

  services.redis = {
    enable = true;
  };

  idx = {
    extensions = [
      # add VSCode extensions if needed
    ];
    workspace = {
      onCreate = {
        npm-install = "npm ci --no-audit --prefer-offline --no-progress --timing";
      };
      # optionally run a command on start
    };
    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "npm" "run" "dev" "--" "--port" "$PORT" ];
          manager = "web";
        };
      };
    };
  };
}
