// Pricing Plan API methods

export async function listPricingPlans() {
    return this.request('/pricing-plans');
}

export async function createPricingPlan(data) {
    return this.request('/pricing-plans', {
        method: 'POST',
        body: data
    });
}

export async function getPricingPlan(id) {
    return this.request(`/pricing-plans/${id}`);
}

export async function updatePricingPlan(id, data) {
    return this.request(`/pricing-plans/${id}`, {
        method: 'PUT',
        body: data
    });
}

export async function deletePricingPlan(id) {
    return this.request(`/pricing-plans/${id}`, {
        method: 'DELETE'
    });
}
