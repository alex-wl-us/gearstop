import { api } from "./client";

export type CalculateResponse = {
  expression: string;
  result: number;
};

export const calculate = (expression: string) =>
  api<CalculateResponse>("/v1/calculate", {
    method: "POST",
    body: JSON.stringify({ expression }),
  });
