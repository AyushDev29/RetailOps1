import React from 'react';
import PreBookingForm from '../../components/forms/PreBookingForm';

function PreBooking() {
  return (
    <div className="pre-booking">
      <h2>Pre-Booking</h2>
      <PreBookingForm onSubmit={(data) => console.log(data)} />
    </div>
  );
}

export default PreBooking;
