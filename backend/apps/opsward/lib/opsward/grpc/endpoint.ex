defmodule OpsWard.GRPC.Endpoint do
  use GRPC.Endpoint

  intercept(GRPC.Server.Interceptors.Logger)
  run(OpsWard.GRPC.CommandServer)
end
