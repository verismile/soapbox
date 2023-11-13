import axios from 'axios';
import { Map as ImmutableMap } from 'immutable';
import debounce from 'lodash/debounce';
import React, { useState, useRef, useCallback } from 'react';
import { useIntl, FormattedMessage, defineMessages } from 'react-intl';
import { Link, useHistory } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import { accountLookup } from 'soapbox/actions/accounts';
import { register, verifyCredentials } from 'soapbox/actions/auth';
import { openModal } from 'soapbox/actions/modals';
import BirthdayInput from 'soapbox/components/birthday-input';
import { Checkbox, Form, FormGroup, FormActions, Button, Input, Textarea, Select } from 'soapbox/components/ui';
import CaptchaField from 'soapbox/features/auth-login/components/captcha';
import { useAppDispatch, useSettings, useFeatures, useInstance } from 'soapbox/hooks';
import countryListAlpha2 from './countryListAlpha2';

const messages = defineMessages({
  username: { id: 'registration.fields.username_placeholder', defaultMessage: 'Username' },
  username_hint: { id: 'registration.fields.username_hint', defaultMessage: 'Only letters, numbers, and underscores are allowed.' },
  fullname_hint: { id: 'registration.fields.fullname_hint', defaultMessage: 'You must provide your real full name, same as your official ID card.' },
  fullname: { id: 'registration.fields.fullname', defaultMessage: 'Full name' },
  password_hint: { id: 'registration.fields.password_hint', defaultMessage: 'The password must have minumum 8 character, at least one uppercase, one lowercase, one special character and a number' }, //verismile
  usernameUnavailable: { id: 'registration.username_unavailable', defaultMessage: 'Username is already taken.' }, // verismile|
  usernameInvalid: { id: 'registration.username_invalid', defaultMessage: 'Invalid username.' }, // verismile|
  password_policy_error: { id: 'registration.password_policy_error', defaultMessage: 'Password does not meet the minimum requirements.' }, // verismile|
  emailUnavailable: { id: 'registration.email_unavailable', defaultMessage: 'E-mail is already taken.' },
  email: { id: 'registration.fields.email_placeholder', defaultMessage: 'E-Mail address' },
  password: { id: 'registration.fields.password_placeholder', defaultMessage: 'Password' },
  passwordMismatch: { id: 'registration.password_mismatch', defaultMessage: 'Passwords don\'t match.' },
  confirm: { id: 'registration.fields.confirm_placeholder', defaultMessage: 'Password (again)' },
  agreement: { id: 'registration.agreement', defaultMessage: 'I agree to the {tos}.' },
  tos: { id: 'registration.tos', defaultMessage: 'Terms of Service' },
  nationality: { id: 'registration.fields.nationality', defaultMessage: 'Nationality' },
  birthday_error: { id: 'registration.birthday_error', defaultMessage: 'You must have at least 18 years old.' },
  close: { id: 'registration.confirmation_modal.close', defaultMessage: 'Close' },
  newsletter: { id: 'registration.newsletter', defaultMessage: 'Subscribe to newsletter.' },
  needsConfirmationHeader: { id: 'confirmations.register.needs_confirmation.header', defaultMessage: 'Confirmation needed' },
  needsApprovalHeader: { id: 'confirmations.register.needs_approval.header', defaultMessage: 'Approval needed' },
  reasonHint: { id: 'registration.reason_hint', defaultMessage: 'This will help us review your application' },
  title: { id: 'registration.fields.title', defaultMessage: 'Thank you for choosing to create a new account. The account price is USD9.90 and is paid once. There are no monthly charges.' },
});

interface IRegistrationForm {
  inviteToken?: string
}

/** Allows the user to sign up for the website. */
const RegistrationForm: React.FC<IRegistrationForm> = ({ inviteToken }) => {
  const intl = useIntl();
  const history = useHistory();
  const dispatch = useAppDispatch();

  const settings = useSettings();
  const features = useFeatures();
  const instance = useInstance();

  // const locale = settings.get('locale');
  const needsConfirmation = !!instance.pleroma.getIn(['metadata', 'account_activation_required']);
  const needsApproval = instance.approval_required;
  const supportsEmailList = features.emailList;
  const supportsAccountLookup = features.accountLookup;
  //  const birthdayRequired = instance.pleroma.getIn(['metadata', 'birthday_required']);
  const birthdayRequired = true;

  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [params, setParams] = useState(ImmutableMap<string, any>());
  const [captchaIdempotencyKey, setCaptchaIdempotencyKey] = useState(uuidv4());
  const [usernameUnavailable, setUsernameUnavailable] = useState(false);
  const [usernameInvalid, setUsernameInvalid] = useState(false); //verismile
  const [emailUnavailable, setEmailUnavailable] = useState(false); // verismile: check email avaiability
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [ageError, setAgeError] = useState(false); //verismile
  const [passwordCheckState, setPasswordCheckState] = useState(false);
  const [nationality, setNationality] = useState('');//verismile

  const source = useRef(axios.CancelToken.source());

  const refreshCancelToken = () => {
    source.current.cancel();
    source.current = axios.CancelToken.source();
    return source.current;
  };

  const updateParams = (map: any) => {
    setParams(params.merge(ImmutableMap(map)));
  };

  const onInputChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = e => {
    updateParams({ [e.target.name]: e.target.value });
  };

  const onUsernameChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    updateParams({ username: e.target.value });
    setUsernameUnavailable(false);
    source.current.cancel();

    usernameAvailable(e.target.value);
  };

  // Verismile: check email avaiability
  const onEmailChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    updateParams({ email: e.target.value });
    setEmailUnavailable(false);
    source.current.cancel();

    emailAvailable(e.target.value);
  };

  const onCheckboxChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    updateParams({ [e.target.name]: e.target.checked });
  };

  const onPasswordChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    const password = e.target.value;
    onInputChange(e);

    if (password === passwordConfirmation) {
      setPasswordMismatch(false);
    }
  };

  const onPasswordConfirmChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    const password = params.get('password', '');
    const passwordConfirmation = e.target.value;
    setPasswordConfirmation(passwordConfirmation);

    if (password === passwordConfirmation) {
      setPasswordMismatch(false);
    }
  };

  const onPasswordConfirmBlur: React.ChangeEventHandler<HTMLInputElement> = () => {
    setPasswordMismatch(!passwordsMatch());
  };

  // verismile
  const onPasswordBlur: React.ChangeEventHandler<HTMLInputElement> = () => {
    setPasswordCheckState(!passwordCheck());
  };


  const onBirthdayChange = (birthday: string) => {
    // verificar idade
    function getAge(dateString: string) {
      var today = new Date();
      var birthDate = new Date(dateString);
      var age = today.getFullYear() - birthDate.getFullYear();
      var m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    if (getAge(birthday) >= 18) {
      setAgeError(false);
    } else {
      setAgeError(true);
    }

    updateParams({ birthday });
  };

  const onNationalityChange: React.ChangeEventHandler<HTMLSelectElement> = e => {
    setNationality(e.target.value);
    updateParams({'nationality': e.target.value});
  };

  const launchModal = () => {
    const message = (<>
      {needsConfirmation && <p>
        <FormattedMessage
          id='confirmations.register.needs_confirmation'
          defaultMessage='Please check your inbox at {email} for confirmation instructions. You will need to verify your email address to continue.'
          values={{ email: <strong>{params.get('email')}</strong> }}
        /></p>}
      {needsApproval && <p>
        <FormattedMessage
          id='confirmations.register.needs_approval'
          defaultMessage='Your account will be manually approved by an admin. Please be patient while we review your details.'
        /></p>}
    </>);

    dispatch(openModal('CONFIRM', {
      icon: require('@tabler/icons/check.svg'),
      heading: needsConfirmation
        ? intl.formatMessage(messages.needsConfirmationHeader)
        : needsApproval
          ? intl.formatMessage(messages.needsApprovalHeader)
          : undefined,
      message,
      confirm: intl.formatMessage(messages.close),
    }));
  };

  const postRegisterAction = ({ access_token }: any) => {
    if (needsConfirmation || needsApproval) {
      return launchModal();
    } else {
      return dispatch(verifyCredentials(access_token)).then(() => {
        history.push('/');
      });
    }
  };

  const passwordsMatch = () => {
    return params.get('password', '') === passwordConfirmation;
  };

  const passwordCheck = () => {
    const regexp = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,}$/;
    return regexp.test(params.get('password', ''));
  };

  const usernameAvailable = useCallback(debounce(username => {
    if (!supportsAccountLookup) return;

    const source = refreshCancelToken();

    // verismile: validate username
    const regex = /^[a-zA-Z0-9_]+$/;
    if (regex.test(username)) {
      setUsernameInvalid(false);
    } else {
      setUsernameInvalid(true);
    }

    dispatch(accountLookup(username, source.token))
      .then(account => {
        setUsernameUnavailable(!!account);
      })
      .catch((error) => {
        if (error.response?.status === 404) {
          setUsernameUnavailable(false);
        }
      });

  }, 1000, { trailing: true }), []);

  // Verismile. check email avaiability
  const emailAvailable = useCallback(debounce(async email => {
    //const source = refreshCancelToken();

    // dispatch(accountLookup(email, source.token))
    //   .then(account => {
    //     setUsernameUnavailable(!!account);
    //   })
    //   .catch((error) => {
    //     if (error.response?.status === 404) {
    //       setUsernameUnavailable(false);
    //     }
    //   });

    try {
      const res = await fetch(`https://verismile.me/api/v1/accounts/lookup?email=${email}`, {
        method: "GET",
        headers: {
          "Content-type": "application/json"
        }
      });
      const data = await res.json();
      console.log("data", data)
      if (data.error) {
        setEmailUnavailable(false);
      } else {
        setEmailUnavailable(true);
      }
    } catch (error) {
      setEmailUnavailable(true)
      console.log(error);
    }
  }, 1000, { trailing: true }), []);

  const onSubmit: React.FormEventHandler = () => {
    if (!passwordsMatch()) {
      setPasswordMismatch(true);
      return;
    }

    // verificar se username está correto
    if (usernameInvalid) {
      return;
    }

    // verificar email
    if (emailUnavailable) {
      return;
    }

    // verificar password
    if (passwordCheckState) {
      return;
    }

    // verificar idade
    if (ageError) {
      return;
    }

    const normalParams = params.withMutations(params => {
      // Locale for confirmation email
      // params.set('locale', locale);

      // Pleroma invites
      if (inviteToken) {
        params.set('token', inviteToken);
      }
    });
    console.log("normalParams", normalParams.toJS());
    createAccount(normalParams);

    setSubmissionLoading(true);

    // dispatch(register(normalParams.toJS()))
    //   .then(postRegisterAction)
    //   .catch(() => {
    //     setSubmissionLoading(false);
    //     refreshCaptcha();
    //   });
  };

  const onCaptchaClick: React.MouseEventHandler = () => {
    refreshCaptcha();
  };

  const onFetchCaptcha = (captcha: ImmutableMap<string, any>) => {
    setCaptchaLoading(false);
    updateParams({
      captcha_token: captcha.get('token'),
      captcha_answer_data: captcha.get('answer_data'),
    });
  };

  const onFetchCaptchaFail = () => {
    setCaptchaLoading(false);
  };

  const refreshCaptcha = () => {
    setCaptchaIdempotencyKey(uuidv4());
    updateParams({ captcha_solution: '' });
  };

  const isLoading = captchaLoading || submissionLoading;

  // Verismile: custom crate API
  const createAccount = async (params: any) => {
    try {
      const res = await fetch("https://verismile.me/checkout/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      console.log(data);
      if (data.redirect) {
        window.location.replace(data.redirect);
      } else {
        throw "error"
      }
    } catch (error) {
      alert("Error");
      console.log(error);
    }
  };

  return (
    <Form onSubmit={onSubmit} data-testid='registrations-open'>
      <fieldset disabled={isLoading} className='space-y-3'>
        <p className='pb-8'>{intl.formatMessage(messages.title)}</p>
        <>
          <FormGroup
            hintText={intl.formatMessage(messages.username_hint)}
            errors={(usernameUnavailable) ? [intl.formatMessage(messages.usernameUnavailable)] : undefined}
          >
            <Input
              type='text'
              name='username'
              placeholder={intl.formatMessage(messages.username)}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              pattern='^[a-zA-Z\d_-]+'
              icon={require('@tabler/icons/at.svg')}
              onChange={onUsernameChange}
              value={params.get('username', '')}
              required
            />
            {usernameInvalid && <p className='text-red-900'>{intl.formatMessage(messages.usernameInvalid)}</p>}
          </FormGroup>

          <FormGroup
            hintText={intl.formatMessage(messages.fullname_hint)}
          //errors={usernameUnavailable ? [intl.formatMessage(messages.usernameUnavailable)] : undefined}
          >
            <Input
              type='text'
              name='full_name'
              placeholder={intl.formatMessage(messages.fullname)}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              onChange={onInputChange}
              value={params.get('full_name', '')}
              required
            />
          </FormGroup>

          <FormGroup
            errors={emailUnavailable ? [intl.formatMessage(messages.emailUnavailable)] : undefined}
          >
            <Input
              type='email'
              name='email'
              placeholder={intl.formatMessage(messages.email)}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              onChange={onEmailChange}
              value={params.get('email', '')}
              required
            />
          </FormGroup>

          <FormGroup
            hintText={intl.formatMessage(messages.password_hint)}
            errors={passwordCheckState ? [intl.formatMessage(messages.password_policy_error)] : undefined}
          >
            <Input
              type='password'
              name='password'
              placeholder={intl.formatMessage(messages.password)}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              onChange={onPasswordChange}
              onBlur={onPasswordBlur}
              value={params.get('password', '')}
              required
            />
          </FormGroup>

          <FormGroup
            errors={passwordMismatch ? [intl.formatMessage(messages.passwordMismatch)] : undefined}
          >
            <Input
              type='password'
              name='password_confirmation'
              placeholder={intl.formatMessage(messages.confirm)}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              onChange={onPasswordConfirmChange}
              onBlur={onPasswordConfirmBlur}
              value={passwordConfirmation}
              required
            />
          </FormGroup>


          <FormGroup
            errors={ageError ? [intl.formatMessage(messages.birthday_error)] : undefined}
          >
            <BirthdayInput
              value={params.get('birthday')}
              onChange={onBirthdayChange}
              required
            />
          </FormGroup>

          <FormGroup
            //hintText={intl.formatMessage(messages.password_hint)}
            hintText={intl.formatMessage(messages.nationality)}
          //errors={usernameUnavailable ? [intl.formatMessage(messages.usernameUnavailable)] : undefined}
          >
            {/* <Input
              type='text'
              name='nationality'
              placeholder={"Nationality"}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              onChange={onInputChange}
              value={params.get('nationality', '')}
              required
            /> */}
            <Select
              name='nationality'
              placeholder='Nationality'
              value={nationality}
              required
              onChange={onNationalityChange}
            >
              <option value=''></option>
              {Object.keys(countryListAlpha2).map((country => (
                <option key={country} value={country}>{countryListAlpha2[country]}</option>
              )))}
              {/* <option value='BR'>Brasil</option>
              <option value='JP'>Japão</option> */}
            </Select>
          </FormGroup>

          {needsApproval && (
            <FormGroup
              labelText={<FormattedMessage id='registration.reason' defaultMessage='Why do you want to join?' />}
            >
              <Textarea
                name='reason'
                placeholder={intl.formatMessage(messages.reasonHint)}
                maxLength={500}
                onChange={onInputChange}
                value={params.get('reason', '')}
                autoGrow
                required
              />
            </FormGroup>
          )}

          {/* <CaptchaField
            onFetch={onFetchCaptcha}
            onFetchFail={onFetchCaptchaFail}
            onChange={onInputChange}
            onClick={onCaptchaClick}
            idempotencyKey={captchaIdempotencyKey}
            name='captcha_solution'
            value={params.get('captcha_solution', '')}
          /> */}

          <FormGroup
            labelText={intl.formatMessage(messages.agreement, { tos: <a href='https://about.verismile.me/terms' target='_blank' key={0} style={{ color: 'blue' }}>{intl.formatMessage(messages.tos)}</a> })}
          >
            <Checkbox
              name='agreement'
              onChange={onCheckboxChange}
              checked={params.get('agreement', false)}
              required
            />
          </FormGroup>

          {supportsEmailList && (
            <FormGroup labelText={intl.formatMessage(messages.newsletter)}>
              <Checkbox
                name='accepts_email_list'
                onChange={onCheckboxChange}
                checked={params.get('accepts_email_list', false)}
              />
            </FormGroup>
          )}

          <FormActions>
            <Button type='submit'>
              <FormattedMessage id='registration.sign_up' defaultMessage='Go to payment' />
            </Button>
          </FormActions>
        </>
      </fieldset>
    </Form>
  );
};

export default RegistrationForm;
