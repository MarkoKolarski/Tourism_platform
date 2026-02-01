package grpc

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	pb "tours-service/proto/purchases"

	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

type PurchasesGRPCClient struct {
	conn   *grpc.ClientConn
	client pb.PurchasesServiceClient
	addr   string
	mu     sync.RWMutex
}

func NewPurchasesGRPCClient(addr string) *PurchasesGRPCClient {
	return &PurchasesGRPCClient{
		addr: addr,
	}
}

func (c *PurchasesGRPCClient) Connect() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Check if we already have a healthy connection
	if c.conn != nil {
		state := c.conn.GetState()
		if state == connectivity.Ready || state == connectivity.Idle {
			return nil
		}
		// Close unhealthy connection
		c.conn.Close()
		c.conn = nil
		c.client = nil
	}

	log.Printf("[gRPC] Attempting to connect to Purchases service at %s", c.addr)

	// Add connection options for better reliability
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                10 * time.Second,
			Timeout:             time.Second,
			PermitWithoutStream: true,
		}),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, c.addr, opts...)
	if err != nil {
		log.Printf("[gRPC] Failed to connect to purchases service at %s: %v", c.addr, err)
		return err
	}

	c.conn = conn
	c.client = pb.NewPurchasesServiceClient(conn)
	log.Printf("[gRPC] Successfully connected to Purchases service at %s", c.addr)
	return nil
}

func (c *PurchasesGRPCClient) VerifyPurchase(userID, tourID int) (bool, string, error) {
	// Try to connect/reconnect if needed
	if err := c.Connect(); err != nil {
		log.Printf("[gRPC] Failed to connect to purchases service: %v", err)
		return false, "", err
	}

	c.mu.RLock()
	client := c.client
	c.mu.RUnlock()

	if client == nil {
		log.Printf("[gRPC] Client not available")
		return false, "", fmt.Errorf("gRPC client not available")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req := &pb.VerifyPurchaseRequest{
		UserId: int32(userID),
		TourId: int32(tourID),
	}

	log.Printf("[gRPC] Sending purchase verification request: user_id=%d, tour_id=%d", userID, tourID)

	resp, err := client.VerifyPurchase(ctx, req)
	if err != nil {
		log.Printf("[gRPC] Error verifying purchase: %v", err)
		// Reset connection on error for next attempt
		c.resetConnection()
		return false, "", err
	}

	if resp.Error != "" {
		log.Printf("[gRPC] Purchase verification error: %s", resp.Error)
		return false, "", fmt.Errorf("purchase verification failed: %s", resp.Error)
	}

	log.Printf("[gRPC] Purchase verification result: user_id=%d, tour_id=%d, has_purchased=%v, token=%s",
		userID, tourID, resp.HasPurchased, resp.TokenId)

	return resp.HasPurchased, resp.TokenId, nil
}

func (c *PurchasesGRPCClient) resetConnection() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		c.conn.Close()
		c.conn = nil
		c.client = nil
		log.Println("[gRPC] Reset purchases service connection due to error")
	}
}

func (c *PurchasesGRPCClient) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn != nil {
		c.conn.Close()
		log.Println("[gRPC] Purchases service connection closed")
		c.conn = nil
		c.client = nil
	}
}
