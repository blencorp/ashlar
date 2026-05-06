export function EligibilityForm() {
  return (
    <form className="usa-form">
      <div className="usa-alert usa-alert--info">
        <div className="usa-alert__body">
          <h2 className="usa-alert__heading">Before you start</h2>
          <p className="usa-alert__text">Have your household income ready.</p>
        </div>
      </div>

      <div className="usa-form-group">
        <label className="usa-label" htmlFor="household-income">
          Household income
        </label>
        <input className="usa-input" id="household-income" name="householdIncome" />
      </div>

      <div className="usa-checkbox">
        <input
          className="usa-checkbox__input"
          id="confirm-income"
          name="confirmIncome"
          type="checkbox"
        />
        <label className="usa-checkbox__label" htmlFor="confirm-income">
          I confirm this income is accurate.
        </label>
      </div>

      <button className="usa-button" type="submit">
        Continue
      </button>
    </form>
  );
}
