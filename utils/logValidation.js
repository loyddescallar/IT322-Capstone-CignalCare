import axiosClient from "../api/axiosClient";

export async function logValidation(field, value, reason) {

  try {

    await axiosClient.post("/validation-log", {
      field,
      input_value: value,
      reason
    });

  } catch (err) {

    console.error("Validation log error:", err);

  }

}