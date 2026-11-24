import { describe, expect, it } from "vitest";
import { passwordError, usernameError, validateRegistration } from "./credential-rules";

const VALID = {
  username: "reader_01",
  email: "reader@example.com",
  password: "matkhau123",
  confirmPassword: "matkhau123",
};

describe("passwordError", () => {
  it.each([
    ["", "password.required"],
    ["abc1234", "password.too_short"],
    ["abcdefgh", "password.no_digit"],
    ["12345678", "password.no_letter"],
    ["a".repeat(128) + "1", "password.too_long"],
  ])("rejects %j with %s", (password, key) => {
    expect(passwordError(password)).toBe(key);
  });

  it("accepts 8 characters with a letter and a digit", () => {
    expect(passwordError("abcdefg1")).toBeUndefined();
    expect(passwordError("1234567đ")).toBeUndefined();
  });
});

describe("validateRegistration", () => {
  it("passes a complete, valid form", () => {
    expect(validateRegistration(VALID)).toEqual({});
  });

  it("reports every empty field", () => {
    expect(validateRegistration({ username: " ", email: "", password: "", confirmPassword: "" })).toEqual({
      username: "username.required",
      email: "email.required",
      password: "password.required",
      confirmPassword: "confirmPassword.required",
    });
  });

  it("reports a bad username, a bad email and a mismatched confirmation", () => {
    expect(
      validateRegistration({ ...VALID, username: "ab", email: "reader@", confirmPassword: "matkhau124" }),
    ).toEqual({
      username: "username.too_short",
      email: "email.invalid",
      confirmPassword: "confirmPassword.mismatch",
    });
    expect(validateRegistration({ ...VALID, username: "tên có dấu" }).username).toBe("username.invalid");
  });
});

describe("usernameError", () => {
  it("accepts letters and digits in any script, with _", () => {
    expect(usernameError("lực_phạm_2004")).toBeUndefined();
    expect(usernameError("reader_01")).toBeUndefined();
  });

  it("rejects spaces, dots and other symbols", () => {
    expect(usernameError("lực phạm")).toBe("username.invalid");
    expect(usernameError("reader.01")).toBe("username.invalid");
    expect(usernameError("reader-01")).toBe("username.invalid");
  });

  it("treats a decomposed accent like the composed one", () => {
    expect(usernameError("lu\u0323c")).toBeUndefined();
  });
});
