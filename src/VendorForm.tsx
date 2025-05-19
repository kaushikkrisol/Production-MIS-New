import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import useVendorStore from '../store/vendorStore';

const groupNameOptions = ['Retail', 'Wholesale', 'Distributor'];
const statusOptions = ['Live', 'Inactive', 'Blocked'];

const vendorSchema = z.object({
  vendorName: z.string(),
  state: z.string(),
  country: z.string(),
  creditLimit: z.string(),
  contactNumber: z.string(),
  groupName: z.string(),
  panNo: z.string(),
  gstinNo: z.string(),
  street: z.string(),
  city: z.string(),
  pincode: z.string(),
  payTerms: z.string(),
  emailId: z.string().email(),
  approvalDate: z.string()
});

const VendorForm = () => {
  const { setVendorData } = useVendorStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendorName: '',
      state: '',
      country: '',
      creditLimit: '',
      contactNumber: '',
      groupName: '',
      panNo: '',
      gstinNo: '',
      street: '',
      city: '',
      pincode: '',
      payTerms: '',
      emailId: '',
      approvalDate: ''
    }
  });

  const onSubmit = (data) => {
    setVendorData(data);
    console.log('Submitted:', data);
  };

  return (
    <div className="page-background">
      <div className="form-box">
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1.5rem' }}>Add Vendor</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="vendor-form-grid">
          {Object.entries(vendorSchema.shape).map(([key]) => (
            <div key={key} className="vendor-form-field">
              <label htmlFor={key}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>

              {key === 'groupName' ? (
                <select {...register("groupName")}>
                  <option value="">Select group</option>
                  {groupNameOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : key === 'status' ? (
                <select {...register("status")}>
                  <option value="">Select status</option>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={key === 'approvalDate' ? 'date' : 'text'}
                  id={key}
                  {...register(key)}
                />
              )}

              {errors[key] && (
                <span className="vendor-form-error">
                  {errors[key]?.message || ''}
                </span>
              )}
            </div>
          ))}

          <div className="vendor-form-buttons">
            <button type="submit" className="submit">Save</button>
            <button type="button" onClick={() => reset()} className="reset">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorForm;
