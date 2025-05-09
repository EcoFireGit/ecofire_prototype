import ValidationError from "@/app/errors/validation-error";

export async function validateString(str_name: string) {
  if (!str_name) {
    throw new ValidationError("missing required field", 400);
  }
  if (typeof str_name !== "string") {
    throw new ValidationError("field must be string", 400);
  }
  if (str_name.length < 2) {
    throw new ValidationError("field must be at least 2 characters long", 400);
  }
  if (str_name.length > 50) {
    throw new ValidationError("field must be at most 50 characters long", 400);
  }
  if (!/^[a-zA-Z0-9 '"’.,!?@#&()\-_:;\\/[\]{}<>|`~$%^*=+]+$/.test(str_name)) {
    //Allow letters, numbers, spaces, quotes, apostrophes, and common special characters:
    throw new ValidationError("field contains invalid characters", 400);
  }

  if (str_name.trim() === "") {
    throw new ValidationError("field cannot be empty", 400);
  }
}

