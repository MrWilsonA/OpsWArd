defmodule OpsWard.GRPC.CommandService do
  use GRPC.Service, name: "opsward.v1.CommandService"

  rpc(:DeclareIncident, OpsWard.GRPC.DeclareIncidentRequest, OpsWard.GRPC.CommandReply)
  rpc(:ConsensusStatus, OpsWard.GRPC.StatusRequest, OpsWard.GRPC.StatusReply)
end
