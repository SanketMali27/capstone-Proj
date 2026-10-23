import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PriorityPreferences from '../../components/PriorityPreferences';
import api from '../../utils/api';

const INITIAL_FORM = {
  foodType: 'cooked',
  quantityRequired: '',
  quantityUnit: 'portions',
};

const FOOD_TYPES = [
  {
    value: 'cooked',
    label: 'Cooked',
  },
  {
    value: 'raw',
    label: 'Raw',
  },
  {
    value: 'packaged',
    label: 'Packaged',
  },
  {
    value: 'dairy',
    label: 'Dairy',
  },
  {
    value: 'bakery',
    label: 'Bakery',
  },
  {
    value: 'mixed',
    label: 'Mixed',
  },
];

const QUANTITY_UNITS = [
  {
    value: 'portions',
    label: 'Portions',
  },
  {
    value: 'kg',
    label: 'Kilograms',
  },
  {
    value: 'litres',
    label: 'Litres',
  },
  {
    value: 'boxes',
    label: 'Boxes',
  },
];

export default function NGODashboard() {
  const [requirements, setRequirements] =
    useState([]);

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [editingId, setEditingId] =
    useState(null);

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [togglingId, setTogglingId] =
    useState(null);

  /**
   * ============================================================
   * LOAD NGO REQUIREMENTS
   * ============================================================
   */
  const loadRequirements = async () => {
    try {
      setLoading(true);
      setError('');

      const response =
        await api.get(
          '/ngo/requirements'
        );

      setRequirements(
        response.data?.data || []
      );
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Could not load requirements'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, []);

  /**
   * ============================================================
   * FORM HANDLER
   * ============================================================
   */
  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /**
   * ============================================================
   * RESET FORM
   * ============================================================
   */
  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
  };

  /**
   * ============================================================
   * CREATE / UPDATE REQUIREMENT
   * ============================================================
   */
  const saveRequirement = async (event) => {
    event.preventDefault();

    setError('');

    const quantity =
      Number(
        form.quantityRequired
      );

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError(
        'Please enter a valid quantity greater than 0.'
      );

      return;
    }

    try {
      setSaving(true);

      const payload = {
        foodType:
          form.foodType,

        quantityRequired:
          quantity,

        quantityUnit:
          form.quantityUnit,
      };

      if (editingId) {
        await api.put(
          `/ngo/requirements/${editingId}`,
          payload
        );
      } else {
        await api.post(
          '/ngo/requirements',
          payload
        );
      }

      resetForm();

      await loadRequirements();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Could not save requirement'
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * ============================================================
   * EDIT REQUIREMENT
   * ============================================================
   */
  const editRequirement = (item) => {
    setError('');

    setEditingId(
      item._id
    );

    setForm({
      foodType:
        item.foodType ||
        'cooked',

      quantityRequired:
        item.quantityRequired ??
        '',

      quantityUnit:
        item.quantityUnit ||
        'portions',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /**
   * ============================================================
   * DELETE REQUIREMENT
   * ============================================================
   */
  const deleteRequirement = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        'Delete this food requirement?'
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setError('');

      await api.delete(
        `/ngo/requirements/${id}`
      );

      if (editingId === id) {
        resetForm();
      }

      await loadRequirements();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Could not delete requirement'
      );
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * ============================================================
   * TOGGLE REQUIREMENT STATUS
   * ============================================================
   */
  const toggleRequirement = async (
    item
  ) => {
    const nextStatus =
      item.status === 'active'
        ? 'paused'
        : 'active';

    try {
      setTogglingId(item._id);
      setError('');

      await api.put(
        `/ngo/requirements/${item._id}`,
        {
          status: nextStatus,
        }
      );

      await loadRequirements();
    } catch (e) {
      setError(
        e.response?.data?.message ||
        'Could not update requirement'
      );
    } finally {
      setTogglingId(null);
    }
  };

  /**
   * ============================================================
   * STATUS STYLES
   * ============================================================
   */
  const getStatusClasses = (
    status
  ) => {
    if (status === 'active') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'fulfilled') {
      return 'bg-blue-100 text-blue-700';
    }

    if (status === 'paused') {
      return 'bg-amber-100 text-amber-700';
    }

    return 'bg-slate-100 text-slate-600';
  };

  /**
   * ============================================================
   * REQUIREMENT PROGRESS
   * ============================================================
   */
  const getProgress = (item) => {
    const required =
      Number(
        item.quantityRequired
      );

    const fulfilled =
      Number(
        item.quantityFulfilled || 0
      );

    if (
      !Number.isFinite(required) ||
      required <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.round(
        (fulfilled / required) *
        100
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* ======================================================
          PAGE INTRO
          ====================================================== */}
      <section className="rounded-[2.5rem] bg-white p-8 shadow-sm">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-600">
          NGO dashboard
        </p>

        <h1 className="mt-2 text-4xl font-semibold text-slate-900">
          Redistribute donations that match your needs
        </h1>

        <p className="mt-3 max-w-3xl text-slate-700">
          Create and manage your food requirements,
          then browse donor-declared human redistribution
          donations that match those requirements.
          Available donations are prioritized using
          operational redistribution factors such as
          demand match, waiting time, distance,
          quantity, and pickup availability.
        </p>
      </section>

      {/* ======================================================
          QUICK ACTIONS
          ====================================================== */}
      <section className="grid gap-5 lg:grid-cols-2">
        <Link
          to="/ngo/available-food"
          className="group rounded-[2rem] bg-slate-900 p-8 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Available donations
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/80">
                Browse available donor-declared
                human redistribution donations,
                review their priority information,
                and request suitable donations.
              </p>
            </div>

            <span className="text-2xl transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>

        <Link
          to="/ngo/claimed-food"
          className="group rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Requests and pickups
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-700">
                Track your requests, view accepted
                donations, confirm pickups, and review
                completed redistribution activity.
              </p>
            </div>

            <span className="text-2xl text-slate-500 transition group-hover:translate-x-1">
              →
            </span>
          </div>
        </Link>
      </section>

      {/* ======================================================
          PRIORITY PREFERENCES
          ====================================================== */}
      <PriorityPreferences />

      {/* ======================================================
          ERROR MESSAGE
          ====================================================== */}
      {error && (
        <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* ======================================================
          REQUIREMENT FORM
          ====================================================== */}
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
            Demand management
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            {editingId
              ? 'Edit food requirement'
              : 'Create a food requirement'}
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Requirements help FoodBridge identify
            donations that match your organization's
            actual needs.
          </p>
        </div>

        <form
          onSubmit={
            saveRequirement
          }
          className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* Food type */}
          <div>
            <label
              htmlFor="foodType"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Food type
            </label>

            <select
              id="foodType"
              value={form.foodType}
              onChange={(e) =>
                updateForm(
                  'foodType',
                  e.target.value
                )
              }
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            >
              {FOOD_TYPES.map(
                (type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label
              htmlFor="quantityRequired"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Quantity needed
            </label>

            <input
              id="quantityRequired"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="Enter quantity"
              value={
                form.quantityRequired
              }
              onChange={(e) =>
                updateForm(
                  'quantityRequired',
                  e.target.value
                )
              }
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {/* Unit */}
          <div>
            <label
              htmlFor="quantityUnit"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Quantity unit
            </label>

            <select
              id="quantityUnit"
              value={
                form.quantityUnit
              }
              onChange={(e) =>
                updateForm(
                  'quantityUnit',
                  e.target.value
                )
              }
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            >
              {QUANTITY_UNITS.map(
                (unit) => (
                  <option
                    key={unit.value}
                    value={unit.value}
                  >
                    {unit.label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Submit */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save changes'
                  : 'Add requirement'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                disabled={saving}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ======================================================
          REQUIREMENT LIST
          ====================================================== */}
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
              Current demand
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              Your food requirements
            </h2>
          </div>

          {!loading && (
            <p className="text-sm text-slate-500">
              {requirements.length}{' '}
              {requirements.length === 1
                ? 'requirement'
                : 'requirements'}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-6 rounded-2xl bg-stone-50 p-6 text-center">
            <p className="text-sm text-slate-500">
              Loading your requirements...
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          requirements.length === 0 && (
            <div className="mt-6 rounded-2xl bg-stone-50 p-6 text-center">
              <h3 className="font-semibold text-slate-900">
                No requirements yet
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                Add a food requirement above
                to help match your organization
                with suitable donations.
              </p>
            </div>
          )}

        {/* Requirement cards */}
        {!loading &&
          requirements.length > 0 && (
            <div className="mt-6 space-y-3">
              {requirements.map(
                (item) => {
                  const progress =
                    getProgress(
                      item
                    );

                  const status =
                    String(
                      item.status ||
                      ''
                    ).toLowerCase();

                  return (
                    <div
                      key={
                        item._id
                      }
                      className="rounded-[1.5rem] bg-stone-50 p-5"
                    >
                      {/* Top row */}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold capitalize text-slate-900">
                              {item.foodType ||
                                'Food'}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                                status
                              )}`}
                            >
                              {status ||
                                'unknown'}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-600">
                            {item.quantityFulfilled ||
                              0}{' '}
                            /{' '}
                            {item.quantityRequired ||
                              0}{' '}
                            {item.quantityUnit}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              editRequirement(
                                item
                              )
                            }
                            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleRequirement(
                                item
                              )
                            }
                            disabled={
                              togglingId ===
                              item._id
                            }
                            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {togglingId ===
                              item._id
                              ? 'Updating...'
                              : status ===
                                'active'
                                ? 'Pause'
                                : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteRequirement(
                                item._id
                              )
                            }
                            disabled={
                              deletingId ===
                              item._id
                            }
                            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId ===
                              item._id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            Requirement fulfilled
                          </span>

                          <span className="font-semibold text-slate-700">
                            {progress}%
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="h-full rounded-full bg-bridge-600 transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
      </section>
    </div>
  );
}