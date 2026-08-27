defmodule OpsWard.Application do
  # See https://elixir.hexdocs.pm/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      OpsWard.Repo,
      {DNSCluster, query: Application.get_env(:opsward, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: OpsWard.PubSub},
      {Task.Supervisor, name: OpsWard.TaskSupervisor},
      {Oban, Application.fetch_env!(:opsward, Oban)},
      OpsWard.Consensus.LocalLedger
    ]

    children =
      children ++
        enabled_children(:raft, OpsWard.Consensus.Cluster) ++
        enabled_children(:kafka, OpsWard.Telemetry.KafkaClient) ++
        enabled_children(:kafka, OpsWard.Telemetry.IngestionPipeline) ++
        grpc_children()

    Supervisor.start_link(children, strategy: :one_for_one, name: OpsWard.Supervisor)
  end

  defp enabled_children(key, child) do
    if Application.get_env(:opsward, key, [])[:enabled], do: [child], else: []
  end

  defp grpc_children do
    grpc = Application.get_env(:opsward, :grpc, [])

    if grpc[:enabled] do
      [
        {GRPC.Server.Supervisor,
         endpoint: OpsWard.GRPC.Endpoint, port: grpc[:port], start_server: true}
      ]
    else
      []
    end
  end
end
