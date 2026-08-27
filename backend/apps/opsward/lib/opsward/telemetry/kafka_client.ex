defmodule OpsWard.Telemetry.KafkaClient do
  use GenServer

  def start_link(_opts), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)

  def publish(topic, payload, key \\ "opsward") do
    if Process.whereis(__MODULE__) do
      GenServer.call(__MODULE__, {:publish, topic, key, payload})
    else
      {:error, :kafka_disabled}
    end
  end

  @impl true
  def init(_state) do
    config = Application.fetch_env!(:opsward, :kafka)
    :ok = :brod.start_client(config[:hosts], config[:client_id], auto_start_producers: true)
    {:ok, config}
  end

  @impl true
  def handle_call({:publish, topic, key, payload}, _from, state) do
    reply = :brod.produce_sync_offset(state[:client_id], topic, :hash, key, payload)
    {:reply, reply, state}
  end
end
