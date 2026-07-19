export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear = (now.getMonth() > birth.getMonth()) ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

export function isMinor(dateOfBirth) {
  const age = calculateAge(dateOfBirth);
  return age === null ? null : age < 18;
}
