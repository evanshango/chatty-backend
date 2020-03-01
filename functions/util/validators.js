const isEmail = email => {
    const regExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return !!email.match(regExp);

};
const isEmpty = string => {
    return string.trim() === '';
};

exports.validateRegData = data => {
    let errors = {};

    if (isEmpty(data.email)) {
        errors.email = 'Must not be empty'
    } else if (!isEmail(data.email)) {
        errors.email = 'Must be a valid email address'
    }

    if (isEmpty(data.password)) errors.password = 'Must not be empty';
    if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords must be the same';
    if (isEmpty(data.handle)) errors.handle = 'Must not be empty';
    return {errors, valid: Object.keys(errors).length === 0}
};

exports.validateSignInData = data => {
    let errors = {};
    if (isEmpty(data.email)) errors.email = 'Must not be empty';
    if (isEmpty(data.password)) errors.password = 'Must not be empty';
    return {errors, valid: Object.keys(errors).length === 0}
};

exports.reduceUserDetails = data => {
  let userDetails = {};
  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.website.trim())) {
      if (data.website.trim().substring(0, 4) !== 'http'){
          userDetails.website = `http://${data.website.trim()}`
      } else userDetails.website = data.website
  }
    if (!isEmpty(data.location.trim())) userDetails.location = data.location;
    return userDetails;
};
