import React from "react";
import { render } from "@testing-library/react";
import { TrackDeleteButton } from "./TrackDeleteButton";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("TrackDeleteButton", () => {
  it("calls onClick", async () => {
    const onClick = jest.fn();
    const result = render(
      <TrackDeleteButton onClick={onClick}></TrackDeleteButton>
    );

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
