import { useState } from 'react';

const InviteUserForm = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email input
    if (!email) {
      setMessage('Please provide an email address.');
      return;
    }

    try {
      // Send the invitation request to the API route
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }), // Only email is sent
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Invitation sent successfully!');
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      setMessage('An error occurred while sending the invitation.');
      console.error('Error inviting user:', error);
    }
  };

  return (
    <div>
      <h2>Invite User</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit">Send Invitation</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
};

export default InviteUserForm;
