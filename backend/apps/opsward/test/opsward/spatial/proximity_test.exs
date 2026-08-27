defmodule OpsWard.Spatial.ProximityTest do
  use ExUnit.Case, async: true

  alias OpsWard.Spatial.Proximity

  test "attenuates linearly and clamps outside the audible radius" do
    assert Proximity.gain({0, 0}, {0, 0}) == 1.0
    assert_in_delta Proximity.gain({0, 0}, {3, 4}, 10), 0.5, 0.0001
    assert Proximity.gain({0, 0}, {20, 0}, 10) == 0.0
    refute Proximity.audible?({0, 0}, {20, 0}, 10)
  end
end
