function computeAge(birthDate, at = new Date()) {
  const birth = new Date(birthDate);
  let age = at.getFullYear() - birth.getFullYear();
  const monthDiff = at.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

const MIN_AGE = Number(process.env.MIN_AGE || 18);

module.exports = { computeAge, MIN_AGE };
