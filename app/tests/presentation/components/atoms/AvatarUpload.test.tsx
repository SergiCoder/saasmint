import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AvatarUpload } from "@/presentation/components/atoms";

describe("AvatarUpload", () => {
  const defaultProps = {
    userName: "Jane Doe",
    uploadLabel: "Upload photo",
    removeLabel: "Remove",
  };

  it("renders the avatar with initials when no src", () => {
    render(<AvatarUpload {...defaultProps} />);
    expect(screen.getByLabelText("Jane Doe")).toHaveTextContent("JD");
  });

  it("renders upload button", () => {
    render(<AvatarUpload {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Upload photo" }),
    ).toBeInTheDocument();
  });

  it("does not render remove button when no currentSrc and no file selected", () => {
    render(<AvatarUpload {...defaultProps} />);
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  it("renders remove button when currentSrc is provided", () => {
    render(
      <AvatarUpload {...defaultProps} currentSrc="https://example.com/a.jpg" />,
    );
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("shows preview after selecting a file", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AvatarUpload {...defaultProps} onChange={onChange} />);

    const file = new File(["img"], "photo.png", { type: "image/png" });
    const input = screen.getByLabelText("Upload photo", {
      selector: "input",
    });

    await user.upload(input, file);

    expect(onChange).toHaveBeenCalledWith(file);
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("calls onChange with null and hides remove button on remove click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AvatarUpload
        {...defaultProps}
        currentSrc="https://example.com/a.jpg"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  it("opens file input when upload button is clicked", async () => {
    const user = userEvent.setup();
    render(<AvatarUpload {...defaultProps} />);

    const input = screen.getByLabelText("Upload photo", {
      selector: "input",
    }) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    await user.click(screen.getByRole("button", { name: "Upload photo" }));
    expect(clickSpy).toHaveBeenCalled();
  });
});
