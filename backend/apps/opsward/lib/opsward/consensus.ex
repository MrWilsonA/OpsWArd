defmodule OpsWard.Consensus do
  def commit(command) do
    if raft_enabled?() and Process.whereis(OpsWard.Consensus.Cluster) do
      OpsWard.Consensus.Cluster.commit(command)
    else
      OpsWard.Consensus.LocalLedger.commit(command)
    end
  end

  def status do
    if raft_enabled?() and Process.whereis(OpsWard.Consensus.Cluster) do
      OpsWard.Consensus.Cluster.status()
    else
      OpsWard.Consensus.LocalLedger.status()
    end
  end

  defp raft_enabled?, do: Application.get_env(:opsward, :raft, [])[:enabled] == true
end
