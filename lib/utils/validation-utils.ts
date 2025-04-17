import ValidationError from "@/app/errors/validation-error";

export async function validateString(str_name: string) {
  if (!str_name) {
    throw new ValidationError('missing required field', 400);
  }
  if (typeof str_name !== 'string') {
    throw new ValidationError('field must be string', 400);
  }
  if (str_name.length < 3) {
    throw new ValidationError('field must be at least 3 characters long', 400);
  }
  if (str_name.length > 50) {
    throw new ValidationError('field must be at most 50 characters long', 400);
  }
  if (!/^[a-zA-Z0-9 ]+$/.test(str_name)) {
    throw new ValidationError('field can only contain alphanumeric characters and spaces', 400);
  }
  if (str_name.trim() === '') {
    throw new ValidationError('field cannot be empty',  400);
  }
}