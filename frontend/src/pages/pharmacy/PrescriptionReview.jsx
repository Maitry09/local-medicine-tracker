import { useState, useEffect } from 'react';
import api, {
  pharmacyAPI,
  stockAPI,
  prescriptionAPI
} from '../../services/api';

import { useNotification } from '../../context/NotificationContext';

const API_BASE =
  import.meta.env.VITE_API_URL?.replace('/api', '') ||
  'http://localhost:5002';

export default function PrescriptionReview() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('all');

  const [rejectionReason, setRejectionReason] =
    useState('');

  const [rejectingId, setRejectingId] =
    useState(null);

  const [stockItems, setStockItems] = useState([]);

  const [
    expandedPrescriptionId,
    setExpandedPrescriptionId
  ] = useState(null);

  const [myPharmacy, setMyPharmacy] =
    useState(null);

  const [responseMessage, setResponseMessage] =
    useState('');

  const [responsePricing, setResponsePricing] =
    useState('');

  const [responseStatus, setResponseStatus] =
    useState('approved');

  const [selectedSuggestions, setSelectedSuggestions] =
    useState([]);

  const [suggestionNotes, setSuggestionNotes] =
    useState({});

  const [
    submittingResponseId,
    setSubmittingResponseId
  ] = useState(null);

  const { showNotification } = useNotification();

  const getPrescriptionImageUrl = (imageUrl) => {
    if (!imageUrl) return '';

    return imageUrl.startsWith('http')
      ? imageUrl
      : `${API_BASE}${imageUrl}`;
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchStock();
    fetchMyPharmacy();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await api.get(
        '/prescriptions/pharmacy'
      );

      setPrescriptions(
        res.data?.data?.prescriptions || []
      );
    } catch {
      showNotification(
        'Failed to load prescriptions',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStock = async () => {
    try {
      const res = await stockAPI.getMyStock({
        limit: 100
      });

      setStockItems(
        res.data?.data?.stock || []
      );
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMyPharmacy = async () => {
    try {
      const res =
        await pharmacyAPI.getMyPharmacy();

      setMyPharmacy(
        res.data?.data?.pharmacy ||
          res.data?.pharmacy ||
          null
      );
    } catch (error) {
      console.error(error);
    }
  };

  const toggleSuggestion = (stockId) => {
    setSelectedSuggestions((prev) =>
      prev.includes(stockId)
        ? prev.filter((id) => id !== stockId)
        : [...prev, stockId]
    );
  };

  const handleNoteChange = (
    stockId,
    value
  ) => {
    setSuggestionNotes((prev) => ({
      ...prev,
      [stockId]: value
    }));
  };

  const getMyResponse = (prescription) => {
    if (
      !myPharmacy ||
      !prescription.responses?.length
    ) {
      return null;
    }

    return prescription.responses.find(
      (resp) => {
        if (!resp.pharmacy) return false;

        return (
          resp.pharmacy._id?.toString() ===
            myPharmacy._id?.toString() ||
          resp.pharmacy?.toString() ===
            myPharmacy._id?.toString()
        );
      }
    );
  };

  const getMyResponseStatus = (
    prescription
  ) => {
    const response =
      getMyResponse(prescription);

    return response?.status || 'pending';
  };

  const handleReview = async (
    id,
    status,
    reason = ''
  ) => {
    try {
      await api.patch(
        `/prescriptions/${id}/review`,
        {
          status,
          message: reason
        }
      );

      showNotification(
        `Prescription ${status}`,
        'success'
      );

      setRejectingId(null);
      setRejectionReason('');

      fetchPrescriptions();
    } catch (err) {
      showNotification(
        err.response?.data?.message ||
          'Action failed',
        'error'
      );
    }
  };

  const handleResponseSubmit = async (
    prescriptionId
  ) => {
    if (
      selectedSuggestions.length === 0 &&
      !responseMessage.trim()
    ) {
      showNotification(
        'Add message or medicines',
        'error'
      );

      return;
    }

    setSubmittingResponseId(
      prescriptionId
    );

    const suggestedMedicines =
      selectedSuggestions.map((stockId) => {
        const stock = stockItems.find(
          (item) => item._id === stockId
        );

        return {
          medicineId:
            stock?.medicine?._id,
          name:
            stock?.medicine?.name ||
            stock?.medicine
              ?.genericName ||
            '',
          available:
            Number(
              stock?.quantity || 0
            ) > 0,
          price: Number(
            stock?.price || 0
          ),
          note:
            suggestionNotes[stockId] ||
            ''
        };
      });

    try {
      await prescriptionAPI.respond(
        prescriptionId,
        {
          status: responseStatus,
          message: responseMessage,
          pricingDetails:
            responsePricing,
          suggestedMedicines
        }
      );

      showNotification(
        'Response sent successfully',
        'success'
      );

      setResponseMessage('');
      setResponsePricing('');
      setResponseStatus('approved');

      setSelectedSuggestions([]);
      setSuggestionNotes({});

      fetchPrescriptions();
    } catch (err) {
      showNotification(
        err.response?.data?.message ||
          'Failed to send response',
        'error'
      );
    } finally {
      setSubmittingResponseId(null);
    }
  };

  const filtered = prescriptions.filter(
    (p) =>
      filter === 'all' ||
      getMyResponseStatus(p) === filter
  );

  if (loading) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2>Prescription Reviews</h2>

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        {[
          'pending',
          'approved',
          'rejected',
          'all'
        ].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${
              filter === f
                ? 'btn-primary'
                : 'btn-outline'
            }`}
          >
            {f.charAt(0).toUpperCase() +
              f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No prescriptions found</h3>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '1rem'
          }}
        >
          {filtered.map((p) => {
            const myResponse =
              getMyResponse(p);

            const hasFinalResponse =
              Boolean(
                myResponse &&
                  [
                    'approved',
                    'rejected'
                  ].includes(
                    myResponse.status
                  )
              );

            return (
              <div
                key={p._id}
                className="card"
              >
                <div className="card-body">
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Image */}
                    <div
                      style={{
                        flexShrink: 0
                      }}
                    >
                      <a
                        href={getPrescriptionImageUrl(
                          p.imageUrl
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={getPrescriptionImageUrl(
                            p.imageUrl
                          )}
                          alt="Prescription"
                          style={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 8
                          }}
                        />
                      </a>
                    </div>

                    {/* Details */}
                    <div
                      style={{ flex: 1 }}
                    >
                      <strong>
                        {p.patient?.name}
                      </strong>

                      <p>
                        {p.patient?.email}
                      </p>

                      <p>
                        {p.patient?.phone}
                      </p>

                      <div
                        style={{
                          marginTop:
                            '0.75rem',
                          display: 'flex',
                          gap: '0.5rem'
                        }}
                      >
                        <span
                          style={{
                            padding:
                              '4px 10px',
                            borderRadius:
                              999,
                            fontSize: 12,
                            background:
                              myResponse
                                ? '#eef2ff'
                                : '#fff4e5',
                            color:
                              myResponse
                                ? '#1d4ed8'
                                : '#92400e',
                            fontWeight: 600
                          }}
                        >
                          {myResponse
                            ? `Response: ${myResponse.status.toUpperCase()}`
                            : 'No response yet'}
                        </span>
                      </div>

                      {/* Buttons */}
                      <div
                        style={{
                          marginTop:
                            '1rem',
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap:
                            'wrap'
                        }}
                      >
                        <button
                          className="btn btn-sm"
                          style={{
                            background:
                              '#2e7d32',
                            color: '#fff'
                          }}
                          onClick={() =>
                            handleReview(
                              p._id,
                              'approved'
                            )
                          }
                          disabled={
                            hasFinalResponse
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() =>
                            setRejectingId(
                              rejectingId ===
                                p._id
                                ? null
                                : p._id
                            )
                          }
                          disabled={
                            hasFinalResponse
                          }
                        >
                          Reject
                        </button>

                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() =>
                            setExpandedPrescriptionId(
                              expandedPrescriptionId ===
                                p._id
                                ? null
                                : p._id
                            )
                          }
                        >
                          View Stock
                        </button>
                      </div>

                      {/* Reject Box */}
                      {rejectingId ===
                        p._id && (
                        <div
                          style={{
                            marginTop:
                              '1rem',
                            display:
                              'flex',
                            gap: '0.5rem'
                          }}
                        >
                          <input
                            className="form-input"
                            placeholder="Reason..."
                            value={
                              rejectionReason
                            }
                            onChange={(
                              e
                            ) =>
                              setRejectionReason(
                                e.target
                                  .value
                              )
                            }
                            style={{
                              flex: 1
                            }}
                          />

                          <button
                            className="btn btn-danger"
                            onClick={() =>
                              handleReview(
                                p._id,
                                'rejected',
                                rejectionReason
                              )
                            }
                          >
                            Confirm
                          </button>
                        </div>
                      )}

                      {/* Expanded Section */}
                      {expandedPrescriptionId === p._id && (
                        <div style={{ marginTop: '1rem' }}>
                          <div className="card" style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ margin: 0 }}>Suggested response</h4>
                                <p className="text-muted" style={{ margin: '0.5rem 0 0' }}>
                                  Choose medicines from your stock, add notes, and send a response to the patient.
                                </p>
                              </div>
                              <div style={{ fontSize: 14, color: '#475569' }}>
                                {stockItems.length} medicines available
                              </div>
                            </div>

                            {hasFinalResponse ? (
                              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 10, background: '#eef2ff' }}>
                                <strong>Response already submitted</strong>
                                {myResponse?.message && (
                                  <p style={{ margin: '0.75rem 0 0', lineHeight: 1.6 }}>
                                    <strong>Message:</strong> {myResponse.message}
                                  </p>
                                )}
                                {myResponse?.pricingDetails && (
                                  <p style={{ margin: '0.5rem 0 0', lineHeight: 1.6 }}>
                                    <strong>Pricing:</strong> {myResponse.pricingDetails}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <>
                                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                                  {stockItems.map((item) => (
                                    <div
                                      key={item._id}
                                      className="card"
                                      style={{
                                        padding: '0.9rem',
                                        borderColor: selectedSuggestions.includes(item._id) ? '#2563eb' : '#e2e8f0',
                                        borderWidth: 1,
                                        borderStyle: 'solid',
                                        boxShadow: '0 1px 2px rgba(15,23,42,0.04)'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                          <input
                                            type="checkbox"
                                            checked={selectedSuggestions.includes(item._id)}
                                            onChange={() => toggleSuggestion(item._id)}
                                          />
                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>
                                              {item.medicine?.name || item.medicine?.genericName || 'Medicine'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                              {item.quantity} units available • ₹{item.price?.toFixed?.(2) ?? item.price}
                                            </div>
                                          </div>
                                        </label>
                                      </div>

                                      {selectedSuggestions.includes(item._id) && (
                                        <div style={{ marginTop: '0.75rem' }}>
                                          <label className="form-label" style={{ marginBottom: '0.35rem' }}>
                                            Suggestion note
                                          </label>
                                          <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Optional note for this medicine"
                                            value={suggestionNotes[item._id] || ''}
                                            onChange={(e) => handleNoteChange(item._id, e.target.value)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <div className="card" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'grid', gap: '1rem' }}>
                                    <div>
                                      <label className="form-label">Response status</label>
                                      <select
                                        className="form-select"
                                        value={responseStatus}
                                        onChange={(e) => setResponseStatus(e.target.value)}
                                      >
                                        <option value="approved">Approve prescription</option>
                                        <option value="rejected">Reject prescription</option>
                                        <option value="pending">Ask for clarification</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="form-label">Response message</label>
                                      <textarea
                                        rows={4}
                                        className="form-textarea"
                                        value={responseMessage}
                                        onChange={(e) => setResponseMessage(e.target.value)}
                                        placeholder="Write a short message for the patient..."
                                      />
                                    </div>

                                    <div>
                                      <label className="form-label">Pricing details</label>
                                      <input
                                        type="text"
                                        className="form-input"
                                        value={responsePricing}
                                        onChange={(e) => setResponsePricing(e.target.value)}
                                        placeholder="Example: 6 tablets @ ₹12 each, total ₹72"
                                      />
                                    </div>

                                    <button
                                      className="btn btn-primary"
                                      onClick={() => handleResponseSubmit(p._id)}
                                      disabled={submittingResponseId === p._id}
                                    >
                                      {submittingResponseId === p._id ? 'Sending...' : 'Send Response'}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}