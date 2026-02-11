// Prisma disabled by user request. Returning a dummy object.
const prisma = new Proxy({}, {
  get: (target, prop) => {
    return () => {
      console.warn(`Prisma call to .${String(prop)}() ignored (Fake DB mode).`);
      return Promise.resolve(null);
    };
  }
});

export default prisma;
