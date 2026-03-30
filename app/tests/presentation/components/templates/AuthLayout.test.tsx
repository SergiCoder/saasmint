import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AuthLayout } from "@/presentation/components/templates";

describe("AuthLayout", () => {
  it("renders the app name via Logo", () => {
    render(
      <AuthLayout appName="Acme" title="Sign in">
        <form />
      </AuthLayout>,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("renders the title as an h1", () => {
    render(
      <AuthLayout appName="Acme" title="Sign in">
        <form />
      </AuthLayout>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <AuthLayout appName="Acme" title="Sign in" subtitle="Welcome back">
        <form />
      </AuthLayout>,
    );
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    render(
      <AuthLayout appName="Acme" title="Sign in">
        <form />
      </AuthLayout>,
    );
    // Only heading + logo text should exist, no subtitle paragraph
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <AuthLayout appName="Acme" title="Sign in">
        <button>Submit</button>
      </AuthLayout>,
    );
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });
});
