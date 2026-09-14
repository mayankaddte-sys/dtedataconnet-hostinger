// Describes each table's primary key + which columns are JSON type, so the
// generic route handlers know how to (de)serialize values correctly.
module.exports = {
  directorate_desks: { pk: 'id', json: [] },
  field_units: { pk: 'id', json: [] },
  app_credentials: { pk: 'identifier', json: [] },
  requisitions: {
    pk: 'id',
    json: [
      'target_zones',
      'target_districts',
      'target_unit_ids',
      'custom_fields',
      'google_sheet_config',
      'google_form_config'
    ]
  },
  submissions: { pk: 'id', json: ['data'] },
  extension_requests: { pk: 'id', json: [] },
  defaulter_notices: { pk: 'id', json: [] }
};
